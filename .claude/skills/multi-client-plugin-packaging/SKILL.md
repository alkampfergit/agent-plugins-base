---
name: multi-client-plugin-packaging
description: >
  Explains and applies this repository's rules for packaging a plugin so it installs
  correctly in Claude Code, GitHub Copilot (CLI/VS Code/cloud agent), and OpenAI Codex
  (CLI/ChatGPT) at the same time. Use whenever the user wants to add a new plugin to
  this repo, restructure it for multi-client support, edit any plugin.json,
  marketplace.json, mcp.json, or hooks.json, review whether a plugin folder is laid out
  correctly, or asks why a plugin installs in one client but not another. Also use
  before tagging/releasing a plugin, or when reconciling drift between the Claude,
  Copilot, and Codex manifests.
compatibility: Node.js required only for scripts/validate-plugin-repo.mjs.
---

# Multi-client agent plugin packaging

Normative for this repository. RFC 2119 keywords (MUST/SHOULD/MAY) below are
deliberate — verified against Claude Code, GitHub Copilot CLI, OpenAI Codex, the Agent
Plugins Specification 1.0.0, and the Agent Skills Specification as of August 2026. All
four specs are moving; re-verify against live docs before a major refactor rather than
trusting dates in this file.

## The one idea that makes this work

Claude Code, GitHub Copilot, and OpenAI Codex have **converged on the same physical
layout** and **diverged only on where the manifest lives**:

| Concern | Claude Code | GitHub Copilot | OpenAI Codex | Agent Plugins v1 |
|---|---|---|---|---|
| Plugin manifest | `.claude-plugin/plugin.json` | `.plugin/plugin.json` → `plugin.json` → `.github/plugin/plugin.json` → `.claude-plugin/plugin.json` (first found wins) | `.codex-plugin/plugin.json` | `plugin.json` (root, required) |
| Skills | `skills/<name>/SKILL.md` | same | same | same |
| MCP | `.mcp.json` | `.mcp.json` / `.github/mcp.json` | `.mcp.json` | `mcp.json` (no dot) |
| Hooks | `hooks/hooks.json` | `hooks.json` / `hooks/hooks.json` | `hooks/hooks.json` | not standardized |
| Agents | `agents/*.md` | `agents/*.agent.md` | `agents/` (plugin-level) | not standardized |
| Marketplace catalog | `.claude-plugin/marketplace.json` | `marketplace.json` → …→ `.claude-plugin/…` | `.agents/plugins/marketplace.json` (+ legacy) | out of scope |
| Plugin root env var | `${CLAUDE_PLUGIN_ROOT}` | `${PLUGIN_ROOT}` | `${PLUGIN_ROOT}` (+ alias) | `${PLUGIN_ROOT}` |
| Data dir env var | `${CLAUDE_PLUGIN_DATA}` | `${COPILOT_PLUGIN_DATA}` (+ alias) | `${PLUGIN_DATA}` (+ alias) | `${PLUGIN_DATA}` |

**Therefore: one directory tree, several thin manifests.** Never fork this repo per
client and never duplicate skill content between clients.

## Canonical repository layout

```text
<repo-root>/
├── .claude-plugin/marketplace.json     # Claude Code catalog (+ Copilot/Codex fallback)
├── .github/plugin/marketplace.json     # Copilot catalog (primary)
├── .agents/plugins/marketplace.json    # Codex catalog (primary)
├── AGENTS.md                           # repo-level instructions (Codex/Copilot/others)
├── CLAUDE.md                           # thin pointer to AGENTS.md
├── plugins/
│   └── <plugin-name>/                  # dir name MUST equal `name` in every manifest
│       ├── plugin.json                 # Agent Plugins v1 manifest (portable floor)
│       ├── .claude-plugin/plugin.json
│       ├── .codex-plugin/plugin.json
│       ├── skills/<skill-name>/SKILL.md
│       ├── mcp.json                    # Agent Plugins v1 MCP format
│       ├── .mcp.json                   # client-native MCP format
│       ├── agents/<name>.agent.md      # optional
│       ├── hooks/hooks.json            # optional, non-load-bearing
│       ├── assets/                     # icons/screenshots
│       ├── README.md / CHANGELOG.md / LICENSE
├── scripts/generate-manifests.mjs      # single source of truth → all manifests
└── README.md
```

This repository now stores each plugin under `plugins/<name>/`, keeps the repository instructions in `AGENTS.md`, and maintains Claude, Copilot, and Codex marketplace catalogs at the root. Add new plugins under `plugins/` and list each one in all three catalogs. Do not move an existing plugin without explicit approval because that can break installation references.

## Non-negotiable structural rules

- **R1.1** Directory name under `plugins/` MUST equal `name` in every manifest present.
- **R1.2** `.claude-plugin/`, `.codex-plugin/`, `.plugin/` MUST contain only
  `plugin.json` (root also gets `marketplace.json`). `skills/`, `agents/`, `commands/`,
  `hooks/`, `bin/` MUST sit at the plugin root, never inside a manifest directory —
  this is the #1 cause of "plugin loads but has no components."
- **R1.3** No `..` in any manifest path. Clients copy the plugin into a cache dir at
  install time, so anything outside the plugin root is simply absent at runtime.
- **R1.4** Every manifest path starts with `./`. Copilot tolerates bare paths; the
  others don't — never rely on the tolerant one.
- **R2.1** `skills/<name>/SKILL.md` is one level deep, fixed, not redirectable without
  losing spec conformance.

Full rule set and rationale, by domain — load only what's relevant to the task:

- [`references/repository-layout.md`](references/repository-layout.md) — layout, R1.x path/dir rules.
- [`references/skills-portable-core.md`](references/skills-portable-core.md) — SKILL.md frontmatter, cross-platform scripts.
- [`references/manifests.md`](references/manifests.md) — all four `plugin.json` variants, field-by-field.
- [`references/mcp-servers.md`](references/mcp-servers.md) — `mcp.json` vs `.mcp.json`, secrets, placeholder expansion.
- [`references/marketplaces.md`](references/marketplaces.md) — the three catalog files, reserved names, remote-source pinning.
- [`references/agents-hooks-instructions.md`](references/agents-hooks-instructions.md) — subagents, hooks (non-portable!), AGENTS.md vs CLAUDE.md.
- [`references/generation-versioning-ci.md`](references/generation-versioning-ci.md) — single source of truth, semver strategy, CI checks.
- [`references/compatibility-matrix.md`](references/compatibility-matrix.md) — what does and doesn't port, feature by feature.

## Checklist: adding or converting a plugin

Copy this into your working notes and tick items off — don't skip steps, each one
catches a failure mode that's otherwise invisible until a specific client tries to
install the plugin:

```
[ ] plugins/<name>/ created; <name> is kebab-case and matches every manifest below
[ ] skills/ written first; description states what+when; validated (skills-ref or by hand)
[ ] plugins/<name>/plugin.json — Agent Plugins v1 manifest (see references/manifests.md §R3.1)
[ ] plugins/<name>/.claude-plugin/plugin.json — Claude Code manifest (§R3.2)
[ ] plugins/<name>/.codex-plugin/plugin.json — Codex manifest incl. `interface` (§R3.3)
[ ] shared fields (name/version/description/author/license/repository/homepage/keywords)
    byte-identical across all three manifests (§R3.5)
[ ] mcp.json + .mcp.json added only if the plugin needs external tools; no secrets (§R4)
[ ] entry added to all three marketplace.json catalogs, same plugin set in each (§R5)
[ ] hooks/, agents/, commands/ added only if genuinely needed; hooks non-load-bearing (§7)
[ ] node .claude/skills/multi-client-plugin-packaging/scripts/validate-plugin-repo.mjs
    run clean (also runs claude plugin validate --strict automatically)
[ ] installed and exercised locally in Claude Code, then Copilot, then Codex
[ ] README.md + CHANGELOG.md + LICENSE present in the plugin directory
[ ] tagged (claude plugin tag --push) and pushed
```

## Templates

[`assets/templates/`](assets/templates/) has a ready-to-copy skeleton for every file
above (`plugin.json`, `claude-plugin.plugin.json`, `codex-plugin.plugin.json`,
`mcp.json`, `dot-mcp.json`, the three `marketplace.json` flavors, `hooks.json`,
`agent-template.agent.md`). Copy, rename by stripping the client prefix into the
correct path, then replace every `REPLACE_ME` placeholder — don't invent new
top-level fields even if a client tolerates them; unknown fields are what strict
validation and cross-client drift both catch.

## Validating a repo or a single plugin

Run the bundled validator whenever you've touched manifests, before every release, and
before telling the user a plugin is ready:

```
node .claude/skills/multi-client-plugin-packaging/scripts/validate-plugin-repo.mjs [repo-root]
```

It implements the mechanical half of `references/generation-versioning-ci.md` §10.2
(name/version consistency, skill-name match, path escapes, symlink escapes,
executable bits, secret-shaped strings in `env`/`headers`, and marketplace-set
consistency across the three catalogs) — checks Claude's own validator has no reason
to know about, because they're about cross-client drift.

It **also** automatically runs `claude plugin validate <path> --strict` (R10.1) against
the repo root and every discovered plugin, and folds a nonzero exit into the overall
result — one command covers both, so you don't have to remember to run the second one.
If the `claude` CLI isn't on PATH, that half is skipped with a warning rather than
failing the run.

Codex has no separate `validate` subcommand — its manifests are only exercised by
actually registering the marketplace and installing:
```
codex plugin marketplace add . && codex plugin add <plugin-name>@<marketplace-name>
```
Any manifest problem surfaces there. `codex plugin marketplace add` errors if a
marketplace with the same `name` is already registered from a different source —
`codex plugin marketplace remove <name>` first if you're re-testing local changes
against a marketplace you'd previously added from its Git remote.
