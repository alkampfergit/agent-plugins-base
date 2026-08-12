# Skills are the portable core (R2.x)

Everything that can be a skill **SHOULD** be a skill. Skills are the only component
type all four specs agree on, and the only one Agent Plugins v1 standardizes alongside
MCP.

### R2.1 — Skill layout is fixed and MUST NOT be overridden
`skills/<skill-name>/SKILL.md`. One level deep only — clients **MUST NOT** recurse
deeper, so nested skill trees silently disappear. Do not point `skills` at a custom
path in the manifest unless you also accept losing spec conformance.

### R2.2 — `SKILL.md` frontmatter uses only the portable field set
```yaml
---
name: deploy-check            # REQUIRED. Must equal the directory name.
description: >                # REQUIRED. Max 1024 chars. This is the trigger.
  Validates a release candidate against the deployment checklist.
  Use when the user mentions deploying, releasing, or shipping to production.
license: MIT                  # optional
metadata:                     # optional, arbitrary string map
  author: alkampfergit
  version: "1.2.0"
compatibility: Requires .NET 10 SDK on PATH   # optional, max 500 chars
---
```
- `name`: 1–64 chars, lowercase `a-z`, `0-9`, `-` only; no leading/trailing hyphen;
  **MUST** match the folder name after NFKC normalization.
- Any key outside `name`, `description`, `license`, `allowed-tools`, `metadata`,
  `compatibility` **fails validation** on strict clients. Client-specific behaviour
  goes in `metadata:` or a sidecar file, never as a new top-level key.
- Frontmatter **MUST** begin at byte 0 with `---`. No BOM, no leading blank line.
- Avoid `<` and `>` in frontmatter — they can inject into the system prompt.

### R2.3 — Write the description as a trigger condition, not a title
At session start the agent loads *only* `name` + `description` for every installed
skill (~100 tokens each). That text is the entire basis for activation. State what it
does **and when to use it**, in the vocabulary users actually type.

### R2.4 — Respect progressive disclosure
Keep `SKILL.md` under ~500 lines / ~5000 tokens. Push detail into `references/`,
executables into `scripts/`, templates into `assets/`. Reference them with relative
paths one level deep (`references/checklist.md`). Deep reference chains are not
followed reliably.

### R2.5 — Scripts must be cross-platform or explicitly gated
Environments here span Windows/WSL2/Linux. Ship `scripts/foo.sh` **and**
`scripts/foo.ps1`, or a single Node/Python file-based script. Mark POSIX executables
`chmod +x` and commit the mode bit — a non-executable hook or script fails silently on
Linux/macOS.
