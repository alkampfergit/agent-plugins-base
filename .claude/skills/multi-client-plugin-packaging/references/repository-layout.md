# Repository layout (R1.x)

## Canonical tree

```text
<repo-root>/
├── .claude-plugin/
│   └── marketplace.json          # Claude Code catalog (+ Copilot & Codex fallback)
├── .github/
│   ├── plugin/
│   │   └── marketplace.json      # Copilot CLI + VS Code catalog (primary)
│   ├── copilot-instructions.md   # instructions for people/agents working ON this repo
│   ├── instructions/*.instructions.md
│   └── workflows/validate.yml    # CI
├── .agents/
│   └── plugins/
│       └── marketplace.json      # Codex catalog (primary)
├── AGENTS.md                     # repo-level agent instructions (Codex + Copilot + others)
├── CLAUDE.md                     # thin pointer to AGENTS.md
│
├── plugins/
│   └── <plugin-name>/            # ← THE PLUGIN. Directory name == manifest `name`.
│       ├── plugin.json                 # Agent Plugins v1 (portable / Copilot / Codex-compatible)
│       ├── .claude-plugin/
│       │   └── plugin.json             # Claude Code manifest
│       ├── .codex-plugin/
│       │   └── plugin.json             # Codex manifest
│       │
│       ├── skills/                     # ← portable core. Identical for all clients.
│       │   └── <skill-name>/
│       │       ├── SKILL.md
│       │       ├── references/
│       │       ├── scripts/
│       │       └── assets/
│       │
│       ├── mcp.json                    # Agent Plugins v1 MCP format ($schema + type)
│       ├── .mcp.json                   # client-native MCP format (Claude/Copilot/Codex)
│       │
│       ├── agents/                     # optional, client-specific (see agents-hooks-instructions.md)
│       │   └── <name>.agent.md
│       ├── commands/                   # optional, Claude Code + Copilot slash commands
│       ├── hooks/
│       │   └── hooks.json              # optional, NOT portable
│       ├── bin/                        # optional, Claude Code adds to Bash PATH
│       ├── assets/                     # icons/logos/screenshots (Codex `interface`)
│       ├── README.md
│       ├── CHANGELOG.md
│       └── LICENSE
│
├── scripts/
│   └── generate-manifests.mjs    # single source of truth → all manifests
├── plugin-source.yaml            # (optional) the single source of truth
├── README.md
└── LICENSE
```

## Rules

### R1.1 — One plugin per directory under `plugins/`
The directory name **MUST** equal the `name` field in every manifest. Copilot CLI
resolves plugins by directory name and labels them by manifest name; a mismatch
produces a plugin that installs but cannot be referenced.

### R1.2 — Never place components inside a manifest directory
`.claude-plugin/`, `.codex-plugin/`, and `.plugin/` **MUST** contain `plugin.json`
(and, at repo root only, `marketplace.json`) and nothing else. Every component
directory — `skills/`, `agents/`, `commands/`, `hooks/`, `bin/` — **MUST** sit at the
plugin root. This is the single most common cause of "plugin loads but has no
components."

### R1.3 — No path escapes
No manifest path may contain `..`. All three clients copy the plugin into a cache
directory at install time (`~/.claude/plugins/cache/`, `~/.copilot/installed-plugins/`,
`~/.codex/plugins/cache/`), so files outside the plugin root are simply absent at
runtime. Symlinks are permitted **only** if they resolve inside the plugin root, or
inside the same marketplace repo (Claude Code dereferences those; everything else is
dropped).

### R1.4 — All manifest paths start with `./`
Required by the Agent Plugins spec, Claude Code, and Codex. Copilot tolerates bare
paths; do not rely on it.
