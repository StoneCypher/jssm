# Language Claude Plugin — Initial Scaffold Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a new Claude Code *plugin* repository for a programming language, containing one well-formed Skill that teaches Claude how to write idiomatic code in that language. The repo is structured so future components (MCP server, slash commands, subagents, hooks, LSP wrapper) can be added without restructure.

**Architecture:** A standalone GitHub repo, organized as a Claude Code plugin per the official plugin spec. The repo is also self-publishing as a single-plugin marketplace, so users install with `/plugin marketplace add <owner>/<repo>` followed by `/plugin install <plugin-name>`. The first and only component in v0.1.0 is a Skill at `skills/<plugin-name>/SKILL.md` whose `description:` frontmatter field triggers Claude to load the skill whenever it sees the target language's syntax, file extensions, or an explicit invocation.

**Tech Stack:**
- Markdown with YAML frontmatter (Skill, SKILL.md)
- JSON (plugin manifest, marketplace manifest)
- Git + GitHub (versioning, distribution)
- Node.js (only if any helper scripts are needed — no Python)
- Conventional Commits

---

## Prerequisites — Gather Before Starting

The engineer executing this plan **MUST** collect the following from the user (the language vendor) before Task 1. Do not invent values. Ask in one batch via `AskUserQuestion` if available, otherwise plain prompts:

| Variable | Example | Notes |
|---|---|---|
| `LANGUAGE_NAME` | "Gleam", "Roc", "Lean" | The human-facing language name. Used in prose. |
| `LANGUAGE_SLUG` | `gleam`, `roc`, `lean` | kebab-case, used in paths and the plugin name. |
| `PLUGIN_NAME` | `gleam` or `gleam-claude` | Final plugin identifier. Default: `LANGUAGE_SLUG`. |
| `REPO_OWNER` | GitHub username or org | e.g. `gleam-lang` |
| `REPO_NAME` | The repo name | Convention: `<LANGUAGE_SLUG>-claude` or `<LANGUAGE_SLUG>-claude-plugin` |
| `FILE_EXTENSIONS` | `.gleam` | One or more, comma-separated. Used in the Skill's trigger description. |
| `LANGUAGE_HOMEPAGE` | `https://gleam.run` | Link target for the README. |
| `LANGUAGE_DOCS_URL` | `https://gleam.run/documentation/` | Link target for the README. |
| `LICENSE_CHOICE` | `MIT`, `Apache-2.0`, etc. | Default: MIT. Ask. |
| `AUTHOR_NAME` | "Gleam Team" | For `plugin.json` author field. |
| `AUTHOR_EMAIL` | `team@gleam.run` | Optional. |

Throughout the rest of this plan, treat the bracketed names (`<LANGUAGE_NAME>`, `<LANGUAGE_SLUG>`, etc.) as substitution placeholders. Every appearance must be replaced with the gathered value before the file is written.

### Authoritative Skills to Invoke During Execution

At the start of execution, **invoke these plugin-dev skills** for the current, authoritative format details — do not rely on this plan alone for file syntax:

- `plugin-dev:plugin-structure` — for `plugin.json` and directory layout
- `plugin-dev:skill-development` — for `SKILL.md` frontmatter and body conventions
- `skill-creator` — to actually generate the skill body (interactive)
- `plugin-dev:plugin-validator` — to validate the plugin once built

If any guidance in those skills contradicts this plan, **the skills win**. This plan captures shape, sequencing, and TDD discipline; the skills capture the exact field names and current best practices.

---

## File Structure (Target End State for v0.1.0)

```
<REPO_NAME>/
├── .claude-plugin/
│   ├── plugin.json          # Plugin manifest
│   └── marketplace.json     # Single-plugin marketplace, points at this same plugin
├── skills/
│   └── <PLUGIN_NAME>/
│       ├── SKILL.md         # The skill itself
│       └── references/      # Optional progressive-disclosure files referenced by SKILL.md
│           └── (empty in v0.1.0; reserved for v0.2.0+)
├── .gitignore
├── LICENSE
├── README.md
└── CHANGELOG.md
```

**Why this shape:**
- `.claude-plugin/` (instead of root-level `plugin.json`) keeps the manifest out of the way of repo-level files and matches the layout used by published plugins.
- `skills/<PLUGIN_NAME>/SKILL.md` is the auto-discovered location. The directory name **must match** the plugin name.
- A `references/` subdirectory next to `SKILL.md` is reserved now so future progressive-disclosure files (e.g. `references/syntax.md`, `references/stdlib-cheatsheet.md`) slot in without restructure.
- No `mcp/`, `commands/`, `agents/`, `hooks/` directories yet. Those land in later versions.

---

## Task 1: Initialize the Repository

**Files:**
- Create: `<repo root>/.gitignore`
- Create: `<repo root>/LICENSE`
- Create: `<repo root>/README.md` (stub only; expanded in Task 9)
- Create: `<repo root>/CHANGELOG.md`

- [ ] **Step 1: Verify the working directory is empty (or only contains a `.git` directory) before starting.**

Run: `ls -A` (POSIX) or `Get-ChildItem -Force` (PowerShell).
Expected: empty, or only `.git`. If anything else is present, stop and ask the user — do not overwrite.

- [ ] **Step 2: Initialize git if not already a repo.**

Run: `git status` first to check.
If "not a git repository", run: `git init`
Expected: `Initialized empty Git repository in ...`

- [ ] **Step 3: Create `.gitignore`.**

Write this exact content to `.gitignore`:

```gitignore
# OS
.DS_Store
Thumbs.db

# Editors
.vscode/
.idea/
*.swp

# Node (in case helper scripts get added later)
node_modules/
npm-debug.log*
.env
.env.local

# Build/test scratch
*.log
tmp/
```

- [ ] **Step 4: Create `LICENSE` matching `<LICENSE_CHOICE>`.**

For MIT, write the standard MIT license text with year `2026` and copyright holder `<AUTHOR_NAME>`. Pull the exact text from https://opensource.org/license/mit if uncertain — do not paraphrase a license.

- [ ] **Step 5: Create stub `README.md`.**

Write:

```markdown
# <LANGUAGE_NAME> Claude Plugin

A Claude Code plugin that teaches Claude to write idiomatic <LANGUAGE_NAME> code.

> Full documentation coming with v0.1.0 release.
```

- [ ] **Step 6: Create empty `CHANGELOG.md`.**

Write:

```markdown
# Changelog

All notable changes to this project will be documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
```

- [ ] **Step 7: Initial commit.**

```bash
git add .gitignore LICENSE README.md CHANGELOG.md
git commit -m "chore: initial repo bootstrap"
```

Expected: one commit, clean working tree.

---

## Task 2: Create the Plugin Manifest

**Files:**
- Create: `.claude-plugin/plugin.json`

- [ ] **Step 1: Invoke `plugin-dev:plugin-structure` skill** to get current authoritative manifest fields.

The skill output supersedes the field list below if they disagree.

- [ ] **Step 2: Create `.claude-plugin/` directory.**

Run: `mkdir .claude-plugin` (POSIX) or `New-Item -ItemType Directory .claude-plugin` (PowerShell).

- [ ] **Step 3: Write `.claude-plugin/plugin.json`.**

Use this skeleton, substituting placeholders. Validate field names against the plugin-structure skill output before writing.

```json
{
  "name": "<PLUGIN_NAME>",
  "version": "0.1.0",
  "description": "Teaches Claude to write idiomatic <LANGUAGE_NAME> code — syntax, conventions, common pitfalls, and standard-library usage.",
  "author": {
    "name": "<AUTHOR_NAME>",
    "email": "<AUTHOR_EMAIL>",
    "url": "<LANGUAGE_HOMEPAGE>"
  },
  "homepage": "https://github.com/<REPO_OWNER>/<REPO_NAME>",
  "repository": "https://github.com/<REPO_OWNER>/<REPO_NAME>",
  "license": "<LICENSE_CHOICE>",
  "keywords": ["<LANGUAGE_SLUG>", "language", "skill", "claude"]
}
```

If `<AUTHOR_EMAIL>` was not provided, omit the `email` key entirely — do not write `"email": ""` or `"email": null`.

- [ ] **Step 4: Validate JSON is well-formed.**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8'))"`
Expected: no output, exit code 0. Any parse error means fix and rerun.

- [ ] **Step 5: Commit.**

```bash
git add .claude-plugin/plugin.json
git commit -m "feat: add plugin manifest"
```

---

## Task 3: Self-Publish as a Single-Plugin Marketplace

**Files:**
- Create: `.claude-plugin/marketplace.json`

**Why:** This makes the repo installable directly via `/plugin marketplace add <REPO_OWNER>/<REPO_NAME>` without needing to publish to any central registry. The marketplace lists exactly one plugin — this one.

- [ ] **Step 1: Confirm the marketplace schema** by consulting `plugin-dev:plugin-structure` skill output for the current `marketplace.json` shape. Do not invent fields.

- [ ] **Step 2: Write `.claude-plugin/marketplace.json`.**

Use this skeleton, validating against the skill:

```json
{
  "name": "<REPO_OWNER>-marketplace",
  "owner": {
    "name": "<AUTHOR_NAME>",
    "url": "<LANGUAGE_HOMEPAGE>"
  },
  "plugins": [
    {
      "name": "<PLUGIN_NAME>",
      "source": ".",
      "description": "Teaches Claude to write idiomatic <LANGUAGE_NAME> code."
    }
  ]
}
```

The `"source": "."` value means "the plugin lives at the root of this same repo" — i.e. the marketplace and the plugin are the same git repository.

- [ ] **Step 3: Validate JSON.**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8'))"`
Expected: exit code 0.

- [ ] **Step 4: Commit.**

```bash
git add .claude-plugin/marketplace.json
git commit -m "feat: add single-plugin marketplace manifest"
```

---

## Task 4: Scaffold the Skill Directory

**Files:**
- Create: `skills/<PLUGIN_NAME>/SKILL.md` (skeleton only — content in Tasks 5–6)
- Create: `skills/<PLUGIN_NAME>/references/.gitkeep`

- [ ] **Step 1: Create directory structure.**

POSIX:
```bash
mkdir -p skills/<PLUGIN_NAME>/references
```

PowerShell:
```powershell
New-Item -ItemType Directory -Force skills/<PLUGIN_NAME>/references
```

- [ ] **Step 2: Create `references/.gitkeep`** so the empty directory commits.

Write empty content to `skills/<PLUGIN_NAME>/references/.gitkeep`.

- [ ] **Step 3: Write `SKILL.md` skeleton** (placeholder content; real content in Tasks 5–6).

```markdown
---
name: <PLUGIN_NAME>
description: PLACEHOLDER — filled in Task 5
---

# <LANGUAGE_NAME>

PLACEHOLDER — body filled in Task 6
```

- [ ] **Step 4: Commit the scaffold.**

```bash
git add skills/
git commit -m "chore: scaffold skill directory"
```

---

## Task 5: Write the Skill `description:` Trigger

> ⚠️ **This is the most important single line of text in the entire plugin.** Claude decides whether to load the skill based on this field. A vague description means the skill never fires; an overly specific one means it misses legitimate triggers.

**Files:**
- Modify: `skills/<PLUGIN_NAME>/SKILL.md` (frontmatter only)

- [ ] **Step 1: Invoke `plugin-dev:skill-development` skill** for current description-writing guidance.

- [ ] **Step 2: Draft the description with the user.**

Use this template, then collaboratively refine with the user:

> "Use when working with <LANGUAGE_NAME> code — files with extensions <FILE_EXTENSIONS>, mentions of <LANGUAGE_NAME>, or questions about <LANGUAGE_NAME> syntax, idioms, standard library, build tooling, or error messages. Teaches idiomatic <LANGUAGE_NAME>, common pitfalls, and how to think about [the language's defining feature — e.g. 'effect tracking', 'gradual typing', 'compile-time evaluation']."

The description **must**:
- Lead with concrete triggers (file extensions, language name, tool names)
- Mention the defining feature(s) of the language that distinguish it from neighbors
- Be specific enough that Claude *won't* load it for a Python question
- Be general enough that Claude *will* load it when a user pastes a stack trace from your compiler

Ask the user: "What are the three things people most often misunderstand about <LANGUAGE_NAME>?" The answers go in the description.

- [ ] **Step 3: Update the `description:` field in `SKILL.md` frontmatter.**

Replace the `PLACEHOLDER` from Task 4 with the refined description. Keep the `name:` field unchanged.

- [ ] **Step 4: Validate frontmatter parses.**

Run:
```bash
node -e "const fs=require('fs');const s=fs.readFileSync('skills/<PLUGIN_NAME>/SKILL.md','utf8');const m=s.match(/^---\n([\s\S]+?)\n---/);if(!m){console.error('no frontmatter');process.exit(1);}console.log(m[1])"
```
Expected: prints the frontmatter block. Any error = malformed YAML, fix.

- [ ] **Step 5: Commit.**

```bash
git add skills/<PLUGIN_NAME>/SKILL.md
git commit -m "feat: write skill description trigger"
```

---

## Task 6: Write the Skill Body

**Files:**
- Modify: `skills/<PLUGIN_NAME>/SKILL.md` (body, below the frontmatter)

> Invoke `skill-creator` to drive this task interactively with the user. It is more reliable than writing the body unguided.

The body should cover, in order:

1. **One-paragraph orientation** — what <LANGUAGE_NAME> is, what it's for, what it isn't.
2. **The mental model** — the single most important thing a Claude needs to understand to write idiomatic code (e.g. for Rust: ownership; for Elixir: actor model + immutability; for Haskell: laziness + purity). Two to four sentences. Concrete.
3. **Syntax landmarks** — minimal, high-value examples. Function definition, type annotation, module declaration, import, error handling. Show, don't describe.
4. **Conventions and idioms** — naming (snake_case vs camelCase vs PascalCase, by entity kind), file organization, what goes in `main`/`lib`/`mod.rs`-equivalent, formatter expectations.
5. **Common pitfalls Claude specifically gets wrong** — collected from the user. These are gold. Example: "Claude often writes `foreach` style loops; idiomatic <LANGUAGE_NAME> uses `.fold()` chains."
6. **Standard library / ecosystem pointers** — which standard modules to reach for first, which popular third-party libs are de facto standard.
7. **Build, test, and tooling** — the canonical commands (`<tool> build`, `<tool> test`, `<tool> fmt`), the formatter name, the linter name. If there's an LSP, name it.
8. **Error messages** — if your compiler's errors have a specific shape, point Claude at how to read them.
9. **References (optional)** — link to `references/*.md` for material too long for inline (e.g. full stdlib cheatsheet, full grammar). Use `[[references/stdlib-cheatsheet]]` style links.

- [ ] **Step 1: Invoke `skill-creator` skill** and follow its interview.

- [ ] **Step 2: Draft each section with the user**, one at a time. For each section: write the draft, show it to the user, revise.

- [ ] **Step 3: After all sections are drafted, do a cold-read pass.** Read the SKILL.md top to bottom as if you'd never seen <LANGUAGE_NAME>. Does the orientation paragraph make sense? Are the syntax examples self-explanatory? If not, revise.

- [ ] **Step 4: Length check.** A v0.1.0 skill body should be in the 200–800 line range. Under 200 lines: not enough substance. Over 800: split material into `references/*.md` files referenced via `[[…]]` links.

- [ ] **Step 5: Commit.**

```bash
git add skills/<PLUGIN_NAME>/SKILL.md skills/<PLUGIN_NAME>/references/
git commit -m "feat: write initial skill body for <LANGUAGE_NAME>"
```

---

## Task 7: Validate Plugin Structure

**Files:** none modified — validation only.

- [ ] **Step 1: Invoke `plugin-dev:plugin-validator` agent.**

Ask it to validate the plugin's structure, manifest, marketplace, and skill frontmatter against current spec.

- [ ] **Step 2: Address every issue it reports.**

For each issue, fix in the relevant file and re-run the validator. Do not move on with known errors.

- [ ] **Step 3: Commit any fixes** (if validation surfaced anything).

```bash
git add -A
git commit -m "fix: address plugin-validator findings"
```

If the validator found nothing, skip the commit.

---

## Task 8: Local Install Smoke Test

**Files:** none modified — manual verification.

- [ ] **Step 1: Install the plugin locally** from the working repo.

In a Claude Code session, run:
```
/plugin marketplace add <absolute path to this repo>
/plugin install <PLUGIN_NAME>
```

Expected: both commands succeed, no errors. The plugin shows up in `/plugin list`.

- [ ] **Step 2: Verify the skill auto-triggers.**

Open or paste a small <LANGUAGE_NAME> snippet into a Claude conversation in the same Claude Code session. Watch for the skill name appearing in Claude's tool invocations / context. If it does not trigger, the `description:` field is wrong — return to Task 5.

- [ ] **Step 3: Verify the skill content is loaded.**

Ask Claude a deliberately tricky <LANGUAGE_NAME> question — one that requires the idioms from Task 6 to answer correctly. If Claude answers using only generic LLM knowledge of the language, the skill isn't actually firing. Debug.

- [ ] **Step 4: Document any findings** in the plan as comments — do not commit them. Iterate on Task 5 or 6 as needed.

---

## Task 9: Write the User-Facing README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the stub `README.md`** from Task 1 with the full version. Use this structure:

````markdown
# <LANGUAGE_NAME> Claude Plugin

A Claude Code plugin that teaches Claude to write idiomatic <LANGUAGE_NAME> code, follow the language's conventions, and avoid common pitfalls.

## What it does

When you work with <LANGUAGE_NAME> code in Claude Code, this plugin automatically loads <LANGUAGE_NAME>-specific guidance covering:

- Syntax and idioms
- Standard library conventions
- Common mistakes the model otherwise makes
- Build, test, and formatter tooling

## Install

In a Claude Code session:

```
/plugin marketplace add <REPO_OWNER>/<REPO_NAME>
/plugin install <PLUGIN_NAME>
```

That's it. The skill auto-activates when Claude detects <LANGUAGE_NAME> code (`<FILE_EXTENSIONS>` files, mentions of <LANGUAGE_NAME>, or related tooling).

## What's in this plugin

| Component | Status | Notes |
|---|---|---|
| Skill | ✅ v0.1.0 | The core: teaches Claude <LANGUAGE_NAME> conventions |
| MCP server | 🚧 Planned | Will expose <LANGUAGE_NAME> tooling (build, test, type-check) as tools Claude can invoke |
| Slash commands | 🚧 Planned | E.g. `/<LANGUAGE_SLUG>-explain`, `/<LANGUAGE_SLUG>-fmt` |
| Subagents | 🚧 Planned | Specialized review/refactor agents |

## Verifying it's working

Ask Claude a <LANGUAGE_NAME> question and check that it mentions <LANGUAGE_NAME>-specific tooling or idioms in its response. If the skill isn't firing for a case it should fire on, please [open an issue](https://github.com/<REPO_OWNER>/<REPO_NAME>/issues).

## Contributing

Issues and PRs welcome. The skill content lives in `skills/<PLUGIN_NAME>/SKILL.md`. If you're a <LANGUAGE_NAME> practitioner and you've seen Claude get something wrong consistently, that's exactly the kind of fix this plugin needs.

## Links

- [<LANGUAGE_NAME> homepage](<LANGUAGE_HOMEPAGE>)
- [<LANGUAGE_NAME> documentation](<LANGUAGE_DOCS_URL>)

## License

<LICENSE_CHOICE>. See [LICENSE](LICENSE).
````

- [ ] **Step 2: Update `CHANGELOG.md`.**

Replace the `## [Unreleased]` section:

```markdown
## [0.1.0] — 2026-05-22

### Added
- Initial release.
- Skill teaching Claude idiomatic <LANGUAGE_NAME>: syntax, conventions, common pitfalls, standard-library pointers, and tooling commands.
- Self-publishing single-plugin marketplace at the repo root.
```

(Use the actual release date, not 2026-05-22, when the engineer executes this.)

- [ ] **Step 3: Commit.**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: write user-facing README and changelog"
```

---

## Task 10: First Release — Tag and Push

> ⚠️ **Stop and ask the user for explicit permission before tagging or pushing.** Tags trigger release pipelines on many setups, and the user's standing instructions require permission per push and per tag.

**Files:** none modified.

- [ ] **Step 1: Confirm with the user.**

Ask: "Plugin is ready for v0.1.0. Should I push to `origin/main` and tag `v0.1.0`? Or do you want to review locally first?"

Wait for an unambiguous yes. "Looks good" is yes; "ok" alone is ambiguous — ask again.

- [ ] **Step 2: Verify remote is configured** (only if the user said yes).

Run: `git remote -v`
Expected: `origin` points at `https://github.com/<REPO_OWNER>/<REPO_NAME>.git`.
If no remote: tell the user the repo must exist on GitHub first; do not run `gh repo create` without separate explicit permission.

- [ ] **Step 3: Push `main`.**

```bash
git push -u origin main
```

- [ ] **Step 4: Tag and push the tag.**

```bash
git tag v0.1.0 -m "v0.1.0: initial release"
git push origin v0.1.0
```

- [ ] **Step 5: (Optional) Create a GitHub release** — only if the user separately approves. Per the user's standing instructions, `gh release create` requires explicit permission.

If approved:
```bash
gh release create v0.1.0 --title "v0.1.0" --notes-file CHANGELOG.md
```

---

## Out of Scope for This Plan (Explicit YAGNI)

The following are deliberately deferred to later plans / later versions:

- **MCP server.** Will be a separate plan once we know which language tools to wrap (formatter, linter, type-checker, REPL). Lives at `mcp/` in this same repo.
- **Slash commands.** Lives at `commands/` later.
- **Subagents.** Lives at `agents/` later.
- **Hooks.** Lives at `hooks/` later.
- **LSP wrapper.** Separate repo or a separate dir; design decision deferred.
- **CI for plugin validation.** Add once the plugin format stabilizes — currently moves too fast.
- **Translated descriptions.** v0.1.0 ships English only.
- **Multi-language plugins.** This plugin covers exactly one language.

Do **not** add stubs for any of the above. They go in when there's real content to fill them.

---

## Definition of Done

All checked when:

- [ ] `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` validate as JSON
- [ ] `skills/<PLUGIN_NAME>/SKILL.md` has a non-placeholder `description:` and a body covering all sections in Task 6
- [ ] `plugin-dev:plugin-validator` reports zero issues
- [ ] Local install via `/plugin marketplace add` and `/plugin install` succeeds
- [ ] Asking Claude a <LANGUAGE_NAME> question in a session with the plugin installed visibly invokes the skill
- [ ] `README.md` lists install instructions and the planned-component table
- [ ] `CHANGELOG.md` has a `0.1.0` entry
- [ ] All commits use Conventional Commits style
- [ ] Repo is pushed to GitHub and tagged `v0.1.0` (with the user's explicit per-step permission)
