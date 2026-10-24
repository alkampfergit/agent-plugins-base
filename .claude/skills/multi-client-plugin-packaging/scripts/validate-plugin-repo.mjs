#!/usr/bin/env node
// Mechanical half of references/generation-versioning-ci.md §R10.2, plus an automatic
// `claude plugin validate --strict` pass (R10.1) against the repo root and every
// discovered plugin — one command covers both.
// Usage: node validate-plugin-repo.mjs [repo-root]
// No dependencies; Node >=18.

import { readFileSync, readdirSync, statSync, lstatSync, realpathSync, existsSync } from "node:fs";
import { join, resolve, relative, basename } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(process.argv[2] || process.cwd());
const SKIP_DIRS = new Set([".git", "node_modules", ".tokensave", ".tokensave-cache", ".claude"]);
const MANIFEST_ONLY_DIRS = new Set([".claude-plugin", ".codex-plugin", ".plugin"]);
const MAX_DEPTH = 6;

const issues = [];
const err = (plugin, message) => issues.push({ level: "error", plugin, message });
const warn = (plugin, message) => issues.push({ level: "warn", plugin, message });

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return { __parseError: e.message };
  }
}

function findPluginRoots(dir, depth = 0, out = []) {
  if (depth > MAX_DEPTH) return out;
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  const dirNames = new Set(entries.filter((e) => e.isDirectory()).map((e) => e.name));
  const hasOwnPluginJson = entries.some((e) => e.isFile() && e.name === "plugin.json");
  const hasClientManifest = [...MANIFEST_ONLY_DIRS].some(
    (d) => dirNames.has(d) && existsSync(join(dir, d, "plugin.json"))
  );
  if ((hasOwnPluginJson || hasClientManifest) && !MANIFEST_ONLY_DIRS.has(basename(dir))) {
    out.push(dir);
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    if (MANIFEST_ONLY_DIRS.has(e.name)) continue; // nothing else to find inside
    findPluginRoots(join(dir, e.name), depth + 1, out);
  }
  return out;
}

function loadManifests(pluginRoot) {
  const manifests = {};
  const candidates = {
    v1: join(pluginRoot, "plugin.json"),
    claude: join(pluginRoot, ".claude-plugin", "plugin.json"),
    codex: join(pluginRoot, ".codex-plugin", "plugin.json"),
    copilotShadow: join(pluginRoot, ".plugin", "plugin.json"),
  };
  for (const [key, path] of Object.entries(candidates)) {
    if (existsSync(path)) manifests[key] = { path, data: readJson(path) };
  }
  return manifests;
}

function checkNameConsistency(pluginRoot, manifests) {
  const dirName = basename(pluginRoot);
  for (const key of Object.keys(manifests)) {
    const { path, data } = manifests[key];
    if (data.name && data.name !== dirName) {
      err(dirName, `${relative(repoRoot, path)}: name "${data.name}" does not match directory name "${dirName}" (R1.1)`);
    }
  }
}

function checkVersionConsistency(pluginRoot, manifests) {
  const dirName = basename(pluginRoot);
  const versions = new Set();
  for (const key of Object.keys(manifests)) {
    const v = manifests[key].data.version;
    if (v) versions.add(v);
  }
  if (versions.size > 1) {
    err(dirName, `version differs across manifests: ${[...versions].join(", ")} (R3.5)`);
  }
}

function checkRootManifestSchema(pluginRoot, manifests) {
  const dirName = basename(pluginRoot);
  const m = manifests.v1;
  if (!m) {
    warn(dirName, "no root plugin.json (Agent Plugins v1 manifest) — Copilot/Codex/VS Code fall back to less-specific manifests only");
    return;
  }
  const allowed = new Set(["$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"]);
  for (const key of Object.keys(m.data)) {
    if (!allowed.has(key)) {
      err(dirName, `plugin.json: unknown top-level field "${key}" (closed schema, R3.1)`);
    }
  }
  if (m.data.author && typeof m.data.author === "object") {
    const allowedAuthor = new Set(["name", "email", "url"]);
    for (const key of Object.keys(m.data.author)) {
      if (!allowedAuthor.has(key)) {
        err(dirName, `plugin.json: unknown author field "${key}" (R3.1 — fatal on strict clients)`);
      }
    }
  }
  if (m.data.name && !/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(m.data.name)) {
    err(dirName, `plugin.json: name "${m.data.name}" must be a-z0-9.- , first/last char alphanumeric (R3.1)`);
  }
  if (m.data.name && (m.data.name.includes("--") || m.data.name.includes(".."))) {
    err(dirName, `plugin.json: name "${m.data.name}" must not contain "--" or ".." (R3.1)`);
  }
}

function parseFrontmatterName(skillMdPath) {
  const text = readFileSync(skillMdPath, "utf8");
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  const frontmatter = text.slice(3, end);
  const match = frontmatter.match(/^\s*name:\s*(.+?)\s*$/m);
  return match ? match[1].replace(/^["']|["']$/g, "") : null;
}

function checkSkillNames(pluginRoot) {
  const dirName = basename(pluginRoot);
  const skillsDir = join(pluginRoot, "skills");
  if (!existsSync(skillsDir)) return;
  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMd = join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillMd)) {
      warn(dirName, `skills/${entry.name}/ has no SKILL.md`);
      continue;
    }
    const name = parseFrontmatterName(skillMd);
    if (name && name !== entry.name) {
      err(dirName, `skills/${entry.name}/SKILL.md: frontmatter name "${name}" does not match folder name (R2.2)`);
    }
  }
}

function checkPathFields(pluginRoot, manifests) {
  const dirName = basename(pluginRoot);
  const pathBearing = [];
  if (manifests.codex) {
    const d = manifests.codex.data;
    for (const key of ["skills", "mcpServers", "hooks"]) {
      if (typeof d[key] === "string") pathBearing.push([manifests.codex.path, key, d[key]]);
    }
    if (d.interface) {
      for (const key of ["composerIcon", "logo"]) {
        if (typeof d.interface[key] === "string") pathBearing.push([manifests.codex.path, `interface.${key}`, d.interface[key]]);
      }
    }
  }
  for (const [file, field, value] of pathBearing) {
    if (value.includes("..")) {
      err(dirName, `${relative(repoRoot, file)}: ${field} "${value}" contains ".." (R1.3 — path escape)`);
    } else if (!value.startsWith("./")) {
      warn(dirName, `${relative(repoRoot, file)}: ${field} "${value}" should start with "./" (R1.4)`);
    }
  }
}

function checkSymlinkEscapes(pluginRoot) {
  const dirName = basename(pluginRoot);
  const walk = (dir, depth) => {
    if (depth > MAX_DEPTH) return;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = join(dir, e.name);
      let lst;
      try {
        lst = lstatSync(full);
      } catch {
        continue;
      }
      if (lst.isSymbolicLink()) {
        try {
          const real = realpathSync(full);
          const rel = relative(repoRoot, real);
          if (rel.startsWith("..")) {
            err(dirName, `${relative(repoRoot, full)}: symlink resolves outside the repo (R1.3)`);
          }
        } catch {
          warn(dirName, `${relative(repoRoot, full)}: symlink target could not be resolved`);
        }
        continue;
      }
      if (lst.isDirectory()) walk(full, depth + 1);
    }
  };
  walk(pluginRoot, 0);
}

function checkExecutableBits(pluginRoot) {
  if (process.platform === "win32") return; // POSIX mode bits are not meaningful here
  const dirName = basename(pluginRoot);
  const scriptsDir = join(pluginRoot, "scripts");
  if (!existsSync(scriptsDir)) return;
  for (const entry of readdirSync(scriptsDir, { withFileTypes: true })) {
    if (!entry.name.endsWith(".sh")) continue;
    const full = join(scriptsDir, entry.name);
    const mode = statSync(full).mode;
    if (!(mode & 0o111)) {
      err(dirName, `scripts/${entry.name}: not executable (chmod +x, R2.5) — fails silently on Linux/macOS`);
    }
  }
}

const SECRET_LIKE = /^(?=.{20,}$)[A-Za-z0-9+/_=-]+$/;
function looksHighEntropy(value) {
  if (typeof value !== "string" || !SECRET_LIKE.test(value)) return false;
  const unique = new Set(value).size;
  return unique / value.length > 0.5; // crude: real secrets vary a lot; placeholders/words don't
}

function checkMcpSecrets(pluginRoot) {
  const dirName = basename(pluginRoot);
  for (const name of ["mcp.json", ".mcp.json"]) {
    const path = join(pluginRoot, name);
    if (!existsSync(path)) continue;
    const data = readJson(path);
    const servers = data.mcpServers || {};
    for (const [serverName, server] of Object.entries(servers)) {
      for (const bag of [server.env, server.headers]) {
        if (!bag) continue;
        for (const [k, v] of Object.entries(bag)) {
          if (looksHighEntropy(v)) {
            warn(dirName, `${name}: mcpServers.${serverName}.${k} looks like a committed secret (R4.3) — verify`);
          }
        }
      }
    }
  }
}

function checkMarketplaceSets() {
  const catalogs = {
    claude: join(repoRoot, ".claude-plugin", "marketplace.json"),
    copilot: join(repoRoot, ".github", "plugin", "marketplace.json"),
    codex: join(repoRoot, ".agents", "plugins", "marketplace.json"),
  };
  const sets = {};
  for (const [client, path] of Object.entries(catalogs)) {
    if (!existsSync(path)) continue;
    const data = readJson(path);
    sets[client] = new Set((data.plugins || []).map((p) => p.name));
  }
  const clients = Object.keys(sets);
  if (clients.length < 2) {
    warn("(root)", `only ${clients.length} of 3 marketplace catalogs present — cannot cross-check plugin sets (R5)`);
    return;
  }
  const union = new Set(clients.flatMap((c) => [...sets[c]]));
  for (const name of union) {
    const missingFrom = clients.filter((c) => !sets[c].has(name));
    if (missingFrom.length > 0) {
      err("(root)", `plugin "${name}" missing from marketplace catalog(s): ${missingFrom.join(", ")} (R10.2 #9)`);
    }
  }
}

// Each client roots relative sources differently: Claude Code applies metadata.pluginRoot
// only to bare names (no "/"), Copilot prepends it to every relative source, and Codex
// uses source.path from the marketplace root. Resolve each the way its client does.
function resolveCatalogSource(client, data, entry) {
  const pluginRoot = data.metadata?.pluginRoot || ".";
  if (client === "codex") {
    return entry.source?.source === "local" ? join(repoRoot, entry.source.path) : null;
  }
  if (typeof entry.source !== "string") return null;
  if (client === "claude" && entry.source.includes("/")) return join(repoRoot, entry.source);
  return join(repoRoot, pluginRoot, entry.source);
}

function checkMarketplaceSources() {
  const catalogs = {
    claude: join(repoRoot, ".claude-plugin", "marketplace.json"),
    copilot: join(repoRoot, ".github", "plugin", "marketplace.json"),
    codex: join(repoRoot, ".agents", "plugins", "marketplace.json"),
  };
  for (const [client, path] of Object.entries(catalogs)) {
    if (!existsSync(path)) continue;
    const data = readJson(path);
    for (const entry of data.plugins || []) {
      const resolved = resolveCatalogSource(client, data, entry);
      if (resolved && !(existsSync(resolved) && statSync(resolved).isDirectory())) {
        err("(root)", `${client} catalog: plugin "${entry.name}" source resolves to missing directory ${relative(repoRoot, resolved)} (R5)`);
      }
    }
  }
}

function claudeCliAvailable() {
  const probe = spawnSync("claude --version", { shell: true, encoding: "utf8" });
  return !probe.error && probe.status === 0;
}

function runClaudeStrictValidate(label, targetPath) {
  const result = spawnSync(`claude plugin validate "${targetPath}" --strict`, {
    shell: true,
    encoding: "utf8",
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  if (output) console.log(`\n--- claude plugin validate --strict: ${label} ---\n${output}`);
  if (result.status !== 0) {
    err(label, `claude plugin validate --strict failed (exit ${result.status}) — see output above (R10.1)`);
  }
}

const pluginRoots = findPluginRoots(repoRoot);
if (pluginRoots.length === 0) {
  console.log(`No plugin.json found under ${repoRoot} (looked ${MAX_DEPTH} levels deep).`);
} else {
  for (const pluginRoot of pluginRoots) {
    const manifests = loadManifests(pluginRoot);
    checkNameConsistency(pluginRoot, manifests);
    checkVersionConsistency(pluginRoot, manifests);
    checkRootManifestSchema(pluginRoot, manifests);
    checkSkillNames(pluginRoot);
    checkPathFields(pluginRoot, manifests);
    checkSymlinkEscapes(pluginRoot);
    checkExecutableBits(pluginRoot);
    checkMcpSecrets(pluginRoot);
  }
}
checkMarketplaceSets();
checkMarketplaceSources();

if (claudeCliAvailable()) {
  runClaudeStrictValidate("(root)", repoRoot);
  for (const pluginRoot of pluginRoots) {
    runClaudeStrictValidate(basename(pluginRoot), pluginRoot);
  }
} else {
  warn("(root)", "claude CLI not found on PATH — skipped `claude plugin validate --strict` (R10.1); install Claude Code to get full coverage");
}

const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warn");

console.log(`\nChecked ${pluginRoots.length} plugin(s) under ${repoRoot}\n`);
for (const i of issues) {
  console.log(`${i.level === "error" ? "ERROR" : "WARN "} [${i.plugin}] ${i.message}`);
}
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s).`);

process.exit(errors.length > 0 ? 1 : 0);
