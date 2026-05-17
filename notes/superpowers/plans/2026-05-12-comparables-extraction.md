# Comparables Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the 30 (10 libraries × 3 machines) FSM comparison examples currently inlined in `src/doc_md/Shootout.md` into structured JSON under `src/comparables/`, then regenerate Shootout.md from that JSON so multiple websites (jssm docs today, FSL site and code generators later) share one source of truth.

**Architecture:** A per-machine directory tree (`src/comparables/<machine>/<library>.json`) holds self-describing JSON with library metadata, the code example, and target-language annotations. A new Node ESM renderer (`src/buildjs/build_shootout.mjs`) loads the JSON, validates against `schema.json`, and splices generated content between marker comments in `Shootout.md`. The renderer becomes a prerequisite of the existing doc build.

**Tech Stack:** Node ESM (`.mjs`), JSON Schema (handwritten, validated by an existing validator we'll pick during implementation — `ajv` is on the indirect dependency tree via existing tooling and will be added explicitly), Jest + TypeScript for tests (matches `src/ts/tests/*.spec.ts` convention), WebFetch for npm package metadata lookups.

**Reference spec:** `notes/superpowers/specs/2026-05-12-comparables-extraction-design.md`

---

## File Structure

**Created in this plan:**
- `src/comparables/README.md` — schema overview, how to add a library/machine
- `src/comparables/schema.json` — JSON Schema for per-library files
- `src/comparables/machines.json` — machine titles, blurbs, display order
- `src/comparables/toggle/<library>.json` × 10 — per-library Toggle example
- `src/comparables/traffic-light/<library>.json` × 10 — per-library Traffic light example
- `src/comparables/matter/<library>.json` × 10 — per-library States of Matter example
- `src/buildjs/build_shootout.mjs` — the renderer (CLI + exported pure functions)
- `src/ts/tests/build_shootout.spec.ts` — renderer tests

**Modified in this plan:**
- `src/doc_md/Shootout.md` — add generation markers; everything below the start marker becomes regenerated content
- `package.json` — add `build:shootout` script and wire it into `docs` / `build`

**Library list** (npm name = filename stem):
`jssm`, `xstate`, `javascript-state-machine`, `state-machine`, `nanostate`, `machina`, `finity`, `stately`, `robot`, `faste`

**Machine slugs** (directory names):
`toggle`, `traffic-light`, `matter`

---

## Task 1: Create JSON Schema for per-library files

**Files:**
- Create: `src/comparables/schema.json`

- [ ] **Step 1: Write the schema**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://stonecypher.github.io/jssm/comparables/schema.json",
  "title": "Comparable",
  "description": "A single (machine, library) FSM example for cross-library comparison.",
  "type": "object",
  "additionalProperties": false,
  "required": ["library", "machine", "language", "lines", "official", "canImplement", "code"],
  "properties": {
    "library": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "npm", "homepage", "languages"],
      "properties": {
        "name":      { "type": "string", "minLength": 1 },
        "npm":       { "type": "string", "minLength": 1 },
        "homepage":  { "type": "string", "format": "uri" },
        "languages": {
          "type": "array",
          "minItems": 1,
          "uniqueItems": true,
          "items": { "enum": ["javascript", "typescript", "webassembly"] }
        },
        "typesSource": { "type": "string", "minLength": 1 }
      }
    },
    "machine":  { "enum": ["toggle", "traffic-light", "matter"] },
    "language": { "enum": ["javascript", "typescript", "webassembly"] },
    "lines":    { "type": "integer", "minimum": 1 },
    "official":     { "type": "boolean" },
    "canImplement": { "type": "boolean" },
    "source": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "url":  { "type": "string", "format": "uri" },
        "note": { "type": "string", "minLength": 1 }
      }
    },
    "code": { "type": "string", "minLength": 1 },
    "formattedWith": { "type": ["string", "null"] }
  }
}
```

- [ ] **Step 2: Commit**

```
git add src/comparables/schema.json
git commit -m "feat(comparables): add JSON Schema for per-library FSM examples"
```

---

## Task 2: Create machines.json

**Files:**
- Create: `src/comparables/machines.json`

- [ ] **Step 1: Write the file** (blurbs are verbatim from `src/doc_md/Shootout.md` lines 51–55, 270–276, 575–581)

```json
{
  "toggle": {
    "title": "Toggle machine",
    "blurb": "In essence, a simple light switch.  Just shows the basics of making states, and linking them with actions."
  },
  "traffic-light": {
    "title": "Traffic light",
    "blurb": "Three state, no `off`, no `flashing red`.  Emit a console log of `'Red light!'` whenever the red state is entered.\n\nShows the basics, as well as putting a hook on a state (or a node in some systems' lingo.)"
  },
  "matter": {
    "title": "States of Matter",
    "blurb": "Three basic states of matter.  Hook each of the four transitions with chatter on follow.\n\nIn addition to the basics, shows how to put a hook on a transition (or an action or an edge, in other machines' terminology.)"
  }
}
```

- [ ] **Step 2: Commit**

```
git add src/comparables/machines.json
git commit -m "feat(comparables): add machine metadata (titles, blurbs, display order)"
```

---

## Task 3: Create README.md

**Files:**
- Create: `src/comparables/README.md`

- [ ] **Step 1: Write the README**

```markdown
# Comparables

Structured FSM comparison data shared across the jssm typedoc site, the FSL
site, and future code-generator targets. The hand-edited inline examples in
`src/doc_md/Shootout.md` are regenerated from these files by
`src/buildjs/build_shootout.mjs` — do not edit Shootout's generated block by
hand; edit the JSON here and re-run `npm run build:shootout`.

## Layout

```
src/comparables/
  schema.json          JSON Schema for per-library files
  machines.json        machine titles, blurbs, display order
  toggle/<lib>.json    one file per library implementing the toggle machine
  traffic-light/<lib>.json
  matter/<lib>.json
```

## Per-library file shape

See `schema.json`. Required fields:

- `library.name`, `library.npm`, `library.homepage`, `library.languages`
- `machine` (must match the parent directory name)
- `language` (must be a member of `library.languages`)
- `lines` (must equal `code.split('\n').length`; renderer cross-checks)
- `official` — `true` if drawn from the library's docs; `false` if synthesized
- `canImplement` — `false` if the library cannot correctly implement this machine
- `code` — the example, newlines as `\n`

Optional fields:

- `source.url`, `source.note` — citation for the example
- `formattedWith` — `"prettier"` for most entries, omitted/`null` for entries
  that prettier formats poorly (finity)
- `library.typesSource` — populated only when the library lacks first-party
  types but a `@types/<pkg>` package exists

## Adding a library

1. Pick the npm package name; lowercase it; use as the filename stem.
2. Research `library.languages` against the npm registry and the project's
   GitHub: does it ship `.d.ts`? Is there a `@types/<pkg>`? Any wasm build?
3. Add `<library>.json` to each machine directory the library implements.
4. Run `npm run build:shootout` and verify `src/doc_md/Shootout.md` regenerates
   cleanly.

## Adding a machine

1. Add a new entry to `machines.json` (order matters — it's the display order).
2. Add the machine slug to the `machine` enum in `schema.json`.
3. Create the machine directory and one `<library>.json` file per implementing
   library.
4. Run `npm run build:shootout`.

## Forward extension to non-JS

Non-JS ports of an example use a language-suffixed filename alongside the JS
file: `xstate.ts.json` next to `xstate.json`. The unsuffixed form is implicitly
JavaScript. The `language` field inside disambiguates; the suffix exists only
because the filesystem can't hold two files of the same name. Add new
languages to the enum in `schema.json` when the first port arrives.
```

- [ ] **Step 2: Commit**

```
git add src/comparables/README.md
git commit -m "docs(comparables): add README explaining schema and authoring workflow"
```

---

## Task 4: Add generation markers to Shootout.md

**Files:**
- Modify: `src/doc_md/Shootout.md`

- [ ] **Step 1: Read the current file's intro section** to confirm exactly which lines to preserve

Run: `Read src/doc_md/Shootout.md offset=1 limit=50`
Expected: intro paragraphs ending around line 26 with "Libraries are sorted shortest-average first, with failing libraries sorted to the end."

- [ ] **Step 2: Locate the start of generated content**

The quicktab table at line 28 (`<span id="quicktab">`) and everything below is what becomes generated. Find the exact line where generated content begins.

- [ ] **Step 3: Insert marker comments**

Insert immediately *before* `<span id="quicktab">`:

```
<!-- COMPARABLES:GENERATED-START — do not edit by hand; regenerated from src/comparables/ -->
```

Insert at the very end of the file:

```
<!-- COMPARABLES:GENERATED-END -->
```

Leave the existing content between the markers untouched for now — Task 19 will verify the renderer produces the same content.

- [ ] **Step 4: Commit**

```
git add src/doc_md/Shootout.md
git commit -m "chore(comparables): mark Shootout.md generation zone with comment markers"
```

---

## Task 5: Research library language targets

This task gathers `library.languages` data for all 10 libraries up front so subsequent per-library extraction tasks have it ready.

- [ ] **Step 1: Parallel WebFetch each library's npm page**

Issue 10 WebFetch calls in one message (parallel). For each library, fetch `https://www.npmjs.com/package/<npm-name>` and ask: "Does this package ship TypeScript types (look for a 'TypeScript' indicator, `types`/`typings` in package.json, or `.d.ts` files in the published tarball)? Does the description or homepage mention WebAssembly or non-JS hosts? Provide a yes/no for each and quote the supporting evidence."

Libraries: `jssm`, `xstate`, `javascript-state-machine`, `state-machine`, `nanostate`, `machina`, `finity`, `stately`, `robot`, `faste`

- [ ] **Step 2: For any library that does NOT ship its own types, WebFetch the @types page**

For example: `https://www.npmjs.com/package/@types/machina`. If the page exists and the package is real (not a placeholder), the library qualifies for `"typescript"` with `library.typesSource: "@types/<name>"`.

- [ ] **Step 3: Record findings in a research note**

Create `notes/comparables-research.md` (a working note, peer of the plan, not the plan itself). Write a markdown table:

```markdown
# Comparables library research

Output of plan Task 5. Subsequent per-library tasks read `languages`,
`homepage`, and optional `typesSource` from this file.

| library | homepage | languages | typesSource (if any) | notes |
| --- | --- | --- | --- | --- |
| jssm | https://stonecypher.github.io/jssm/ | javascript, typescript | — | ships .d.ts |
| xstate | https://xstate.js.org | javascript, typescript | — | TS-native |
| ... | ... | ... | ... | ... |
```

Fill in one row per library. Quote the evidence (e.g. "package.json says `types: ./dist/index.d.ts`" or "`@types/machina` exists and last published 2018") in the `notes` column.

- [ ] **Step 4: Commit the research note**

```
git add notes/comparables-research.md
git commit -m "chore(comparables): record library language-target research findings"
```

---

## Tasks 6–15: Per-library JSON extraction

For each library in {`jssm`, `xstate`, `javascript-state-machine`, `state-machine`, `nanostate`, `machina`, `finity`, `stately`, `robot`, `faste`}, perform one task that:

1. Reads the three sections in `src/doc_md/Shootout.md` containing that library's Toggle, Traffic light, and Matter entries.
2. Creates `src/comparables/toggle/<lib>.json`, `src/comparables/traffic-light/<lib>.json`, `src/comparables/matter/<lib>.json`.
3. Commits all three files in one commit.

The shape of every task is identical; only the library changes. The walkthrough below uses **jssm** as the worked example. Subsequent tasks (7–15) follow this exact pattern, substituting the library and using the same per-library research output from Task 5.

### Task 6: Extract jssm

**Files:**
- Create: `src/comparables/toggle/jssm.json`
- Create: `src/comparables/traffic-light/jssm.json`
- Create: `src/comparables/matter/jssm.json`

- [ ] **Step 1: Locate jssm's Toggle entry in Shootout.md**

Run: `Grep -n "^### .jssm. toggle" src/doc_md/Shootout.md`
Expected: a line number matching `### \`jssm\` toggle machine, 1 line`

Read 20 lines starting there to find the code block and any prose annotation.

- [ ] **Step 2: Write `src/comparables/toggle/jssm.json`**

```json
{
  "library": {
    "name": "jssm",
    "npm": "jssm",
    "homepage": "https://stonecypher.github.io/jssm/",
    "languages": ["javascript", "typescript"]
  },
  "machine": "toggle",
  "language": "javascript",
  "lines": 1,
  "official": true,
  "canImplement": true,
  "code": "export const toggleMachine = sm`active 'TOGGLE' <=> 'TOGGLE' inactive;`;",
  "formattedWith": "prettier"
}
```

Note: jssm's homepage is taken from `package.json` line 162 (`"homepage": "https://stonecypher.github.io/jssm/"`).

- [ ] **Step 3: Locate jssm's Traffic light entry**

Run: `Grep -n "^### .jssm. traffic" src/doc_md/Shootout.md`

- [ ] **Step 4: Write `src/comparables/traffic-light/jssm.json`**

```json
{
  "library": {
    "name": "jssm",
    "npm": "jssm",
    "homepage": "https://stonecypher.github.io/jssm/",
    "languages": ["javascript", "typescript"]
  },
  "machine": "traffic-light",
  "language": "javascript",
  "lines": 2,
  "official": true,
  "canImplement": true,
  "code": "export const trafficLight = sm`red 'next' => green 'next' => yellow 'next' => red;`;\ntrafficLight.hook_global_action(\"next\", () => console.log(\"Red light!\"));",
  "formattedWith": "prettier"
}
```

- [ ] **Step 5: Locate jssm's States of Matter entry**

Run: `Grep -n "^### .jssm. states of matter" src/doc_md/Shootout.md`

- [ ] **Step 6: Write `src/comparables/matter/jssm.json`** (the 5 lines of code come from Shootout.md lines 601–605)

```json
{
  "library": {
    "name": "jssm",
    "npm": "jssm",
    "homepage": "https://stonecypher.github.io/jssm/",
    "languages": ["javascript", "typescript"]
  },
  "machine": "matter",
  "language": "javascript",
  "lines": 5,
  "official": true,
  "canImplement": true,
  "code": "export const matter = sm`solid 'melt' <=> 'freeze' liquid 'vaporize' <=> 'condense' gas`;\ntrafficLight.hook_global_action('melt', () => console.log('I melted'));\ntrafficLight.hook_global_action('freeze', () => console.log('I froze'));\ntrafficLight.hook_global_action('vaporize', () => console.log('I vaporized'));\ntrafficLight.hook_global_action('condense', () => console.log('I condensed'));",
  "formattedWith": "prettier"
}
```

(Note: the jssm matter example references `trafficLight` rather than `matter` for its hooks — this is a copy-paste artifact in the original; preserve it verbatim. Surfacing or fixing it is out of scope for this plan.)

- [ ] **Step 7: Verify line counts**

For each of the three files, confirm:
- `code.split('\n').length === lines`

Use this Node one-liner per file:
```
node -e "const f=require('./src/comparables/toggle/jssm.json'); console.log(f.lines, f.code.split('\\n').length)"
```
Expected: both numbers match for each file.

- [ ] **Step 8: Commit**

```
git add src/comparables/toggle/jssm.json src/comparables/traffic-light/jssm.json src/comparables/matter/jssm.json
git commit -m "feat(comparables): extract jssm examples (toggle, traffic light, matter)"
```

### Per-library extraction procedure (applies to Tasks 7–15)

Each per-library task creates three JSON files (one per machine) and produces one commit. The procedure is identical; only the library and its specifics vary. Each task below is self-contained — a subagent picking up just that task has the line numbers, JSON skeletons, and library metadata it needs without consulting Task 6.

**Heading semantics:** `### \`<lib>\`` = `"official": true`; `### (created) \`<lib>\`` = `"official": false`. A `, ❌ cannot implement` suffix on the heading or a `<fail>...</fail>` wrap of the cell in the top summary table = `"canImplement": false`.

**Code extraction:** For each section in Shootout.md, the code body lives between the opening ```` ```javascript ```` line and the closing ```` ``` ```` line. Copy verbatim, preserving single quotes, backticks, and indentation. Newlines become `\n` in JSON.

**Source attribution:** If the section's prose between the heading and the code fence contains a URL or hand-written note (e.g. "From their documentation [link]", "Finity did not have a light switch example. I made this following [link] as a style guide."), capture it as `source.note` (the prose, with the URL stripped to a bare reference) and `source.url` (the URL).

**Cross-check before commit (every task):** for each of the three files, `code.split('\n').length === lines`. Use:
```
node -e "const f=require('./src/comparables/<machine>/<lib>.json'); console.log(f.lines, f.code.split('\\n').length)"
```

---

### Task 7: Extract xstate

**Files:**
- Create: `src/comparables/toggle/xstate.json`
- Create: `src/comparables/traffic-light/xstate.json`
- Create: `src/comparables/matter/xstate.json`

Library metadata (same in all three files):
- `library.name`: `"xstate"`
- `library.npm`: `"xstate"`
- `library.homepage`: `"https://xstate.js.org"`
- `library.languages`: `["javascript", "typescript"]` (verify against Task 5's findings)

Per-machine specifics:
- **Toggle** — Shootout.md heading at line 78; code at lines 82–98 (16 lines). `"official": true`, `"canImplement": true`. Source: prose says "From [their documentation](https://xstate.js.org/docs/recipes/svelte.html#machine-js)" → `source.note`: `"From their documentation"`, `source.url`: `"https://xstate.js.org/docs/recipes/svelte.html#machine-js"`.
- **Traffic light** — heading at line 302; code below it (36 lines). `"official": false` (the "(created)" prefix), `"canImplement": true`. Prose contains a source URL (or two); capture as `source`.
- **Matter** — **heading at line 610 is mistitled** in Shootout.md ("(created) xstate traffic light, 33 lines"); the section's prose ("xstate did not have a states of matter example…") and code below it are actually the matter example. Use `"machine": "matter"`, `"lines": 33`, `"official": false`, `"canImplement": true`. Capture the prose as `source.note` and any URL as `source.url`. (Fixing the Shootout.md heading is out of scope; the renderer will regenerate the correct heading anyway.)

- [ ] **Step 1: Read Shootout.md sections** at lines 78–100, 302–350, 610–656 (use Read with offset+limit).

- [ ] **Step 2: Write `src/comparables/toggle/xstate.json`**

```json
{
  "library": { "name": "xstate", "npm": "xstate", "homepage": "https://xstate.js.org", "languages": ["javascript", "typescript"] },
  "machine": "toggle",
  "language": "javascript",
  "lines": 16,
  "official": true,
  "canImplement": true,
  "source": { "url": "https://xstate.js.org/docs/recipes/svelte.html#machine-js", "note": "From their documentation" },
  "code": "<verbatim code from Shootout.md lines 82–97, newlines as \\n>",
  "formattedWith": "prettier"
}
```

- [ ] **Step 3: Write `src/comparables/traffic-light/xstate.json`**

```json
{
  "library": { "name": "xstate", "npm": "xstate", "homepage": "https://xstate.js.org", "languages": ["javascript", "typescript"] },
  "machine": "traffic-light",
  "language": "javascript",
  "lines": 36,
  "official": false,
  "canImplement": true,
  "source": { "url": "<URL from prose>", "note": "<prose note>" },
  "code": "<verbatim code from the section's fenced block>",
  "formattedWith": "prettier"
}
```

- [ ] **Step 4: Write `src/comparables/matter/xstate.json`**

```json
{
  "library": { "name": "xstate", "npm": "xstate", "homepage": "https://xstate.js.org", "languages": ["javascript", "typescript"] },
  "machine": "matter",
  "language": "javascript",
  "lines": 33,
  "official": false,
  "canImplement": true,
  "source": { "url": "<URL from prose>", "note": "<prose note>" },
  "code": "<verbatim code from the section's fenced block>",
  "formattedWith": "prettier"
}
```

- [ ] **Step 5: Verify line counts** per the cross-check command above.

- [ ] **Step 6: Commit**
```
git add src/comparables/toggle/xstate.json src/comparables/traffic-light/xstate.json src/comparables/matter/xstate.json
git commit -m "feat(comparables): extract xstate examples (toggle, traffic light, matter)"
```

---

### Task 8: Extract javascript-state-machine

**Files:**
- Create: `src/comparables/toggle/javascript-state-machine.json`
- Create: `src/comparables/traffic-light/javascript-state-machine.json`
- Create: `src/comparables/matter/javascript-state-machine.json`

Library metadata:
- `library.name`: `"javascript-state-machine"`
- `library.npm`: `"javascript-state-machine"`
- `library.homepage`: `"https://github.com/jakesgordon/javascript-state-machine"`
- `library.languages`: per Task 5 research (default prior: `["javascript"]`; add `"typescript"` if `@types/javascript-state-machine` exists)

Per-machine specifics:
- **Toggle** — heading at line 103; code follows (7 lines). `"official": true`, `"canImplement": true`. Prose says "Exported and consted." → `source.note: "Exported and consted."`, no URL.
- **Traffic light** — heading at line 406 (13 lines). `"official": true` (no "(created)" prefix), `"canImplement": true`.
- **Matter** — heading at line 655 (23 lines). The line count is `**bold**` in the top table, indicating this is upstream-official code → `"official": true`. `"canImplement": true`.

- [ ] **Step 1: Read Shootout.md sections** at lines 103–117, 406–430, 655–690.

- [ ] **Step 2: Write `src/comparables/toggle/javascript-state-machine.json`**

```json
{
  "library": { "name": "javascript-state-machine", "npm": "javascript-state-machine", "homepage": "https://github.com/jakesgordon/javascript-state-machine", "languages": ["javascript"] },
  "machine": "toggle",
  "language": "javascript",
  "lines": 7,
  "official": true,
  "canImplement": true,
  "source": { "note": "Exported and consted." },
  "code": "<verbatim from Shootout.md lines 107–114>",
  "formattedWith": "prettier"
}
```

- [ ] **Step 3: Write `src/comparables/traffic-light/javascript-state-machine.json`** (analogous shape, 13 lines, official:true).

- [ ] **Step 4: Write `src/comparables/matter/javascript-state-machine.json`** (analogous shape, 23 lines, official:true).

- [ ] **Step 5: Verify line counts.**

- [ ] **Step 6: Commit**
```
git add src/comparables/toggle/javascript-state-machine.json src/comparables/traffic-light/javascript-state-machine.json src/comparables/matter/javascript-state-machine.json
git commit -m "feat(comparables): extract javascript-state-machine examples"
```

---

### Task 9: Extract state-machine

**Files:**
- Create: `src/comparables/toggle/state-machine.json`
- Create: `src/comparables/traffic-light/state-machine.json`
- Create: `src/comparables/matter/state-machine.json`

Library metadata:
- `library.name`: `"state-machine"`
- `library.npm`: `"state-machine"`
- `library.homepage`: per Task 5 research (likely `https://github.com/davestewart/javascript-state-machine`; the npm package `state-machine` and `javascript-state-machine` are different — verify during research)
- `library.languages`: per Task 5

Per-machine specifics:
- **Toggle** — heading at line 220 (5 lines). `"official": false` (prose says "No toggle machine was available; wrote from scratch and used [the docs]…"). Wait — actually the heading is `### \`state-machine\` toggle machine, 5 lines` without "(created)" prefix. Reading the prose: "No toggle machine was available; wrote from scratch…" — that IS synthesized, but the heading lacks the "(created)" tag. **The heading inconsistency in Shootout.md is a known authoring artifact.** Resolution: `"official"` derives from the prose semantics, not the heading. Set `"official": false` because the prose explicitly says "wrote from scratch". `"canImplement": true`.
- **Traffic light** — heading at line 518 (8 lines). Inspect prose for "(created)" semantics; set `official` accordingly.
- **Matter** — heading at line 883 (14 lines). Inspect prose.

- [ ] **Step 1: Read Shootout.md sections** at lines 220–232, 518–537, 883–908. Read prose carefully to determine `official` for each.

- [ ] **Step 2–4: Write the three JSON files** with library metadata above and per-machine fields derived from the reading.

- [ ] **Step 5: Verify line counts.**

- [ ] **Step 6: Commit**
```
git add src/comparables/toggle/state-machine.json src/comparables/traffic-light/state-machine.json src/comparables/matter/state-machine.json
git commit -m "feat(comparables): extract state-machine examples"
```

---

### Task 10: Extract nanostate

**Files:**
- Create: `src/comparables/toggle/nanostate.json`
- Create: `src/comparables/traffic-light/nanostate.json`
- Create: `src/comparables/matter/nanostate.json`

Library metadata:
- `library.name`: `"nanostate"`
- `library.npm`: `"nanostate"`
- `library.homepage`: `"https://github.com/choojs/nanostate"`
- `library.languages`: per Task 5

Per-machine specifics:
- **Toggle** — heading at line 159 (8 lines). Prose: "Robot did not have a toggle example…" (note: prose mistakenly says "Robot" — this is an authoring artifact in Shootout.md; capture as the verbatim note). `"official": false`, `"canImplement": true`.
- **Traffic light** — heading at line 429 (12 lines). The top table bolds this entry → `"official": true`. `"canImplement": true`.
- **Matter** — heading at line 770 reads `, ❌ cannot implement` → `"canImplement": false`. Lines: 15. Inspect prose for `official`.

- [ ] **Step 1: Read** sections at lines 159–175, 429–457, 770–807.

- [ ] **Step 2–4: Write the three JSON files.**

- [ ] **Step 5: Verify line counts.**

- [ ] **Step 6: Commit**
```
git add src/comparables/toggle/nanostate.json src/comparables/traffic-light/nanostate.json src/comparables/matter/nanostate.json
git commit -m "feat(comparables): extract nanostate examples"
```

---

### Task 11: Extract machina

**Files:**
- Create: `src/comparables/toggle/machina.json`
- Create: `src/comparables/traffic-light/machina.json`
- Create: `src/comparables/matter/machina.json`

Library metadata:
- `library.name`: `"machina"`
- `library.npm`: `"machina"`
- `library.homepage`: `"http://machina-js.org/"`
- `library.languages`: per Task 5

Per-machine specifics:
- **Toggle** — heading at line 235 (20 lines). Prose: "No toggle machine example was available; wrote from scratch and used the `pedestrianSignal` example [in their landing page]…" → `"official": false`, `"canImplement": true`, source URL from prose.
- **Traffic light** — heading at line 536 (26 lines). Inspect prose.
- **Matter** — heading at line 907 reads `, ❌ cannot implement` → `"canImplement": false`. Lines: 36. Inspect prose for `official`.

- [ ] **Step 1: Read** sections at lines 235–270, 536–574, 907–end.

- [ ] **Step 2–4: Write the three JSON files.**

- [ ] **Step 5: Verify line counts.**

- [ ] **Step 6: Commit**
```
git add src/comparables/toggle/machina.json src/comparables/traffic-light/machina.json src/comparables/matter/machina.json
git commit -m "feat(comparables): extract machina examples"
```

---

### Task 12: Extract finity

**Files:**
- Create: `src/comparables/toggle/finity.json`
- Create: `src/comparables/traffic-light/finity.json`
- Create: `src/comparables/matter/finity.json`

Library metadata:
- `library.name`: `"finity"`
- `library.npm`: `"finity"`
- `library.homepage`: `"https://github.com/nickuraltsev/finity"`
- `library.languages`: per Task 5

**All three files have `"formattedWith": null`** — Shootout.md explicitly notes finity is not formatted with prettier ("I don't format `finity` with `prettier` because `prettier` does an unreasonably bad job with the oddly nested callback structure").

Per-machine specifics:
- **Toggle** — heading at line 119 with `(created)` prefix (7 lines). `"official": false`, `"canImplement": true`. Source URL: `https://github.com/nickuraltsev/finity/blob/master/examples/hierarchical/index.js`.
- **Traffic light** — heading at line 349 (10 lines). `(created)`.
- **Matter** — heading at line 689 (28 lines). `(created)`.

- [ ] **Step 1: Read** sections at lines 119–138, 349–378, 689–736.

- [ ] **Step 2–4: Write the three JSON files** with `"formattedWith": null` in each.

- [ ] **Step 5: Verify line counts.**

- [ ] **Step 6: Commit**
```
git add src/comparables/toggle/finity.json src/comparables/traffic-light/finity.json src/comparables/matter/finity.json
git commit -m "feat(comparables): extract finity examples (formattedWith: null)"
```

---

### Task 13: Extract stately

**Files:**
- Create: `src/comparables/toggle/stately.json`
- Create: `src/comparables/traffic-light/stately.json`
- Create: `src/comparables/matter/stately.json`

Library metadata:
- `library.name`: `"stately"`
- `library.npm`: per Task 5 research — if the package is published as `stately.js`, use `"stately.js"`; if as `stately`, use `"stately"`. Filename remains `stately.json` regardless (filename can deviate from `library.npm` when the npm name contains a `.` that would muddle filename parsing).
- `library.homepage`: `"https://github.com/fschaefer/Stately.js"`
- `library.languages`: per Task 5

Per-machine specifics:
- **Toggle** — heading at line 140 with `(created)` (8 lines). `"official": false`. Source URL from prose: `https://github.com/fschaefer/Stately.js#examples`.
- **Traffic light** — heading at line 377 with `(created)` (18 lines).
- **Matter** — heading at line 735 with `(created)` (24 lines).

- [ ] **Step 1: Read** sections at lines 140–158, 377–407, 735–770.

- [ ] **Step 2–4: Write the three JSON files.**

- [ ] **Step 5: Verify line counts.**

- [ ] **Step 6: Commit**
```
git add src/comparables/toggle/stately.json src/comparables/traffic-light/stately.json src/comparables/matter/stately.json
git commit -m "feat(comparables): extract stately examples"
```

---

### Task 14: Extract robot

**Files:**
- Create: `src/comparables/toggle/robot.json`
- Create: `src/comparables/traffic-light/robot.json`
- Create: `src/comparables/matter/robot.json`

Library metadata:
- `library.name`: `"robot"`
- `library.npm`: per Task 5 research — likely `"robot3"` (the package Shootout calls "robot" is published as `robot3` on npm). Filename remains `robot.json` for consistency with Shootout's labeling.
- `library.homepage`: `"https://thisrobot.life/"`
- `library.languages`: per Task 5

Per-machine specifics:
- **Toggle** — heading at line 178 with `(created)` (17 lines). Source URL: `https://thisrobot.life/api/action.html`.
- **Traffic light** — heading at line 456 with `(created)` (24 lines).
- **Matter** — heading at line 806 with `(created)` (31 lines).

- [ ] **Step 1: Read** sections at lines 178–205, 456–495, 806–849.

- [ ] **Step 2–4: Write the three JSON files.**

- [ ] **Step 5: Verify line counts.**

- [ ] **Step 6: Commit**
```
git add src/comparables/toggle/robot.json src/comparables/traffic-light/robot.json src/comparables/matter/robot.json
git commit -m "feat(comparables): extract robot examples"
```

---

### Task 15: Extract faste

**Files:**
- Create: `src/comparables/toggle/faste.json`
- Create: `src/comparables/traffic-light/faste.json`
- Create: `src/comparables/matter/faste.json`

Library metadata:
- `library.name`: `"faste"`
- `library.npm`: `"faste"`
- `library.homepage`: per Task 5 research (typically `https://github.com/theKashey/faste` or the npm page)
- `library.languages`: per Task 5 (expected `["javascript", "typescript"]` — faste is TS-authored)

Per-machine specifics:
- **Toggle** — heading at line 205 (4 lines). `"official": true`. Source URL: `https://www.npmjs.com/package/faste#using-different-handlers-in-different-states`.
- **Traffic light** — heading at line 494 (14 lines). Inspect prose for `official`.
- **Matter** — heading at line 848 with `(created)` (24 lines). `"official": false`.

- [ ] **Step 1: Read** sections at lines 205–219, 494–519, 848–884.

- [ ] **Step 2–4: Write the three JSON files.**

- [ ] **Step 5: Verify line counts.**

- [ ] **Step 6: Commit**
```
git add src/comparables/toggle/faste.json src/comparables/traffic-light/faste.json src/comparables/matter/faste.json
git commit -m "feat(comparables): extract faste examples"
```

---

**Filename vs `library.npm` deviation:** Tasks 13 (stately) and 14 (robot) may set `library.npm` to a value that differs from the filename stem. This is the only sanctioned exception to "filename equals npm name". The renderer must not enforce filename = `library.npm` equality; it enforces only that `machine` matches the directory name.

---

## Task 16: Renderer scaffold and first failing test

**Files:**
- Create: `src/buildjs/build_shootout.mjs`
- Create: `src/ts/tests/build_shootout.spec.ts`

- [ ] **Step 1: Install ajv as a dev dependency**

```
npm install --save-dev ajv ajv-formats
```

Expected: `package.json` `devDependencies` gains `ajv` and `ajv-formats`.

- [ ] **Step 2: Create the renderer skeleton**

`src/buildjs/build_shootout.mjs`:

```javascript
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const comparablesDir = path.join(repoRoot, 'src', 'comparables');
const shootoutPath = path.join(repoRoot, 'src', 'doc_md', 'Shootout.md');

const START_MARKER = '<!-- COMPARABLES:GENERATED-START';
const END_MARKER   = '<!-- COMPARABLES:GENERATED-END -->';

export async function loadAll(dir = comparablesDir) {
  const schema   = JSON.parse(await readFile(path.join(dir, 'schema.json'), 'utf8'));
  const machines = JSON.parse(await readFile(path.join(dir, 'machines.json'), 'utf8'));

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const entries = [];
  for (const machineSlug of Object.keys(machines)) {
    const machineDir = path.join(dir, machineSlug);
    const files = await readdir(machineDir);
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const filePath = path.join(machineDir, file);
      const data = JSON.parse(await readFile(filePath, 'utf8'));
      if (!validate(data))      throw new Error(`Schema failure in ${filePath}: ${ajv.errorsText(validate.errors)}`);
      if (data.machine !== machineSlug)
        throw new Error(`${filePath}: machine field "${data.machine}" does not match directory "${machineSlug}"`);
      const actualLines = data.code.split('\n').length;
      if (data.lines !== actualLines)
        throw new Error(`${filePath}: lines field (${data.lines}) does not match code line count (${actualLines})`);
      if (!data.library.languages.includes(data.language))
        throw new Error(`${filePath}: language "${data.language}" not in library.languages [${data.library.languages.join(', ')}]`);
      entries.push({ ...data, filePath, fileName: file });
    }
  }

  return { machines, entries };
}
```

- [ ] **Step 3: Write the first failing test**

`src/ts/tests/build_shootout.spec.ts`:

```typescript
import { loadAll } from '../../buildjs/build_shootout.mjs';
import * as path from 'node:path';

const comparablesDir = path.resolve(__dirname, '..', '..', 'comparables');

describe('build_shootout: loadAll', () => {
  it('loads all 30 entries across the 3 machines', async () => {
    const { machines, entries } = await loadAll(comparablesDir);
    expect(Object.keys(machines)).toEqual(['toggle', 'traffic-light', 'matter']);
    expect(entries.length).toBe(30);
  });

  it('every entry has a library object with name, npm, homepage, languages', async () => {
    const { entries } = await loadAll(comparablesDir);
    for (const e of entries) {
      expect(typeof e.library.name).toBe('string');
      expect(typeof e.library.npm).toBe('string');
      expect(typeof e.library.homepage).toBe('string');
      expect(Array.isArray(e.library.languages)).toBe(true);
      expect(e.library.languages).toContain('javascript');
    }
  });

  it('every example currently has language "javascript"', async () => {
    const { entries } = await loadAll(comparablesDir);
    for (const e of entries) expect(e.language).toBe('javascript');
  });
});
```

- [ ] **Step 4: Run the test, expect it to pass** (the renderer's `loadAll` is already implemented above)

Run: `npx jest src/ts/tests/build_shootout.spec.ts -c jest-spec.config.cjs`
Expected: 3 passing.

If `jest-spec.config.cjs` doesn't pick up `.mjs` imports from `.ts` tests, the test will fail with a module-resolution error. Fix by adding `'.mjs'` to `moduleFileExtensions` in the Jest config or by using a relative dynamic `import()` in the test. Use the smallest possible fix.

- [ ] **Step 5: Commit**

```
git add src/buildjs/build_shootout.mjs src/ts/tests/build_shootout.spec.ts package.json package-lock.json
git commit -m "feat(comparables): add loadAll + schema validation; add ajv dep"
```

---

## Task 17: Validation failure tests

**Files:**
- Modify: `src/ts/tests/build_shootout.spec.ts`

- [ ] **Step 1: Add validation-failure tests using synthetic in-memory inputs**

The renderer's `loadAll` reads from disk; refactor it to accept a `dir` parameter (already does) and add a test that points it at a temp dir containing a deliberately broken file. Use `fs/promises` and `os.tmpdir()`.

Add to `build_shootout.spec.ts`:

```typescript
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import * as os from 'node:os';

async function tmpComparables(files: Record<string, unknown>): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), 'cmp-'));
  // Copy the real schema + machines for realism
  const realRoot = path.resolve(__dirname, '..', '..', 'comparables');
  await writeFile(path.join(root, 'schema.json'),
    await import('node:fs/promises').then(fs => fs.readFile(path.join(realRoot, 'schema.json'), 'utf8')));
  await writeFile(path.join(root, 'machines.json'),
    await import('node:fs/promises').then(fs => fs.readFile(path.join(realRoot, 'machines.json'), 'utf8')));
  for (const [relPath, body] of Object.entries(files)) {
    const full = path.join(root, relPath);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, typeof body === 'string' ? body : JSON.stringify(body));
  }
  return root;
}

describe('build_shootout: validation failures', () => {
  it('rejects file whose lines field disagrees with code', async () => {
    const dir = await tmpComparables({
      'toggle/jssm.json': {
        library: { name: 'jssm', npm: 'jssm', homepage: 'https://x', languages: ['javascript'] },
        machine: 'toggle', language: 'javascript',
        lines: 999, official: true, canImplement: true,
        code: 'one line only'
      }
    });
    await expect(loadAll(dir)).rejects.toThrow(/lines field \(999\) does not match code line count \(1\)/);
  });

  it('rejects file whose machine field disagrees with parent directory', async () => {
    const dir = await tmpComparables({
      'toggle/jssm.json': {
        library: { name: 'jssm', npm: 'jssm', homepage: 'https://x', languages: ['javascript'] },
        machine: 'matter', language: 'javascript',
        lines: 1, official: true, canImplement: true,
        code: 'x'
      }
    });
    await expect(loadAll(dir)).rejects.toThrow(/machine field "matter" does not match directory "toggle"/);
  });

  it('rejects file whose language is not in library.languages', async () => {
    const dir = await tmpComparables({
      'toggle/jssm.json': {
        library: { name: 'jssm', npm: 'jssm', homepage: 'https://x', languages: ['javascript'] },
        machine: 'toggle', language: 'typescript',
        lines: 1, official: true, canImplement: true,
        code: 'x'
      }
    });
    await expect(loadAll(dir)).rejects.toThrow(/language "typescript" not in library.languages/);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx jest src/ts/tests/build_shootout.spec.ts -c jest-spec.config.cjs`
Expected: 6 passing total (3 original + 3 new).

- [ ] **Step 3: Commit**

```
git add src/ts/tests/build_shootout.spec.ts
git commit -m "test(comparables): cover validation failure modes"
```

---

## Task 18: Section rendering test + implementation

**Files:**
- Modify: `src/buildjs/build_shootout.mjs`
- Modify: `src/ts/tests/build_shootout.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `build_shootout.spec.ts`:

```typescript
import { renderEntry } from '../../buildjs/build_shootout.mjs';

describe('build_shootout: renderEntry', () => {
  const baseEntry = {
    library: { name: 'xstate', npm: 'xstate', homepage: 'https://xstate.js.org', languages: ['javascript', 'typescript'] },
    machine: 'toggle',
    language: 'javascript',
    lines: 1,
    official: true,
    canImplement: true,
    code: 'export const x = 1;'
  };

  it('emits an official entry without the (created) prefix', () => {
    const md = renderEntry(baseEntry, { title: 'Toggle machine' });
    expect(md).toMatch(/^### `xstate` Toggle machine, 1 line/m);
    expect(md).not.toMatch(/\(created\)/);
  });

  it('emits a synthesized entry with the (created) prefix', () => {
    const md = renderEntry({ ...baseEntry, official: false }, { title: 'Toggle machine' });
    expect(md).toMatch(/^### \(created\) `xstate` Toggle machine, 1 line/m);
  });

  it('wraps the heading line count phrase with proper pluralization', () => {
    const md1 = renderEntry({ ...baseEntry, lines: 1 }, { title: 'Toggle machine' });
    const md5 = renderEntry({ ...baseEntry, lines: 5 }, { title: 'Toggle machine' });
    expect(md1).toMatch(/, 1 line$/m);
    expect(md5).toMatch(/, 5 lines$/m);
  });

  it('emits the source note and source url when present', () => {
    const md = renderEntry({
      ...baseEntry,
      source: { url: 'https://example.com/docs', note: 'From their documentation' }
    }, { title: 'Toggle machine' });
    expect(md).toContain('From their documentation');
    expect(md).toContain('https://example.com/docs');
  });

  it('emits a fenced code block tagged with the entry language', () => {
    const md = renderEntry(baseEntry, { title: 'Toggle machine' });
    expect(md).toMatch(/```javascript\nexport const x = 1;\n```/);
  });
});
```

- [ ] **Step 2: Run and confirm the test fails**

Run: `npx jest src/ts/tests/build_shootout.spec.ts -c jest-spec.config.cjs`
Expected: 5 failures referencing `renderEntry is not a function`.

- [ ] **Step 3: Implement `renderEntry`**

Append to `src/buildjs/build_shootout.mjs`:

```javascript
function pluralize(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; }

export function renderEntry(entry, machineMeta) {
  const created = entry.official ? '' : '(created) ';
  const heading = `### ${created}\`${entry.library.name}\` ${machineMeta.title}, ${pluralize(entry.lines, 'line')}`;

  const parts = [heading, ''];
  if (entry.source?.note) parts.push(entry.source.note);
  if (entry.source?.url)  parts.push(`Source: <${entry.source.url}>`);
  if (entry.source?.note || entry.source?.url) parts.push('');

  parts.push('```' + entry.language);
  parts.push(entry.code);
  parts.push('```');

  return parts.join('\n');
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npx jest src/ts/tests/build_shootout.spec.ts -c jest-spec.config.cjs`
Expected: 11 passing.

- [ ] **Step 5: Commit**

```
git add src/buildjs/build_shootout.mjs src/ts/tests/build_shootout.spec.ts
git commit -m "feat(comparables): render per-library entry as markdown section"
```

---

## Task 19: Summary table rendering test + implementation

**Files:**
- Modify: `src/buildjs/build_shootout.mjs`
- Modify: `src/ts/tests/build_shootout.spec.ts`

- [ ] **Step 1: Write the failing test**

Add to `build_shootout.spec.ts`:

```typescript
import { renderQuickTab } from '../../buildjs/build_shootout.mjs';

describe('build_shootout: renderQuickTab', () => {
  it('lists every library as a row with one cell per machine plus an Avg column', async () => {
    const { machines, entries } = await loadAll(path.resolve(__dirname, '..', '..', 'comparables'));
    const md = renderQuickTab(machines, entries);
    // Header contains each machine title and "Avg"
    for (const slug of Object.keys(machines)) expect(md).toContain(machines[slug].title);
    expect(md).toContain('Avg');
    // Every library named in entries appears as a row
    const libs = new Set(entries.map(e => e.library.name));
    for (const lib of libs) expect(md).toContain(`| ${lib} `);
  });

  it('wraps a library with any canImplement:false cell in <fail>', async () => {
    const { machines, entries } = await loadAll(path.resolve(__dirname, '..', '..', 'comparables'));
    const md = renderQuickTab(machines, entries);
    // nanostate and machina fail on matter
    expect(md).toMatch(/<fail>nanostate<\/fail>/);
    expect(md).toMatch(/<fail>machina<\/fail>/);
  });

  it('bolds official-upstream line counts', async () => {
    const { machines, entries } = await loadAll(path.resolve(__dirname, '..', '..', 'comparables'));
    const md = renderQuickTab(machines, entries);
    // jssm rows are all official → all bold
    expect(md).toMatch(/\| jssm \| \*\*\[1\]/);
  });

  it('sorts libraries by ascending average, with any-fail libraries last', async () => {
    const { machines, entries } = await loadAll(path.resolve(__dirname, '..', '..', 'comparables'));
    const md = renderQuickTab(machines, entries);
    const jssmIdx     = md.indexOf('| jssm ');
    const machinaIdx  = md.indexOf('<fail>machina</fail>');
    const nanostateIdx = md.indexOf('<fail>nanostate</fail>');
    expect(jssmIdx).toBeLessThan(machinaIdx);
    expect(jssmIdx).toBeLessThan(nanostateIdx);
  });
});
```

- [ ] **Step 2: Run and confirm the test fails** (`renderQuickTab is not a function`)

- [ ] **Step 3: Implement `renderQuickTab`**

Append to `src/buildjs/build_shootout.mjs`:

```javascript
function anchorFor(entry, machineMeta) {
  const prefix = entry.official ? '' : 'created-';
  const slug = `${prefix}${entry.library.name}-${machineMeta.title.toLowerCase().replace(/\s+/g, '-')}-${pluralize(entry.lines, 'line')}`.replace(/[^a-z0-9-]/g, '');
  return slug;
}

export function renderQuickTab(machines, entries) {
  const machineSlugs = Object.keys(machines);
  const libraries = [...new Set(entries.map(e => e.library.name))];

  const rows = libraries.map(libName => {
    const cells = machineSlugs.map(slug => entries.find(e => e.library.name === libName && e.machine === slug));
    const anyFail = cells.some(c => c && !c.canImplement);
    const nameCell = anyFail ? `<fail>${libName}</fail>` : libName;

    const counts = cells.map(c => {
      if (!c) return { text: '', value: null };
      const anchor = anchorFor(c, machines[c.machine]);
      const num = c.official ? `**[${c.lines}](#${anchor})**` : `[${c.lines}](#${anchor})`;
      const wrapped = c.canImplement ? num : `<fail>${num}</fail>`;
      return { text: wrapped, value: c.lines };
    });

    const knownValues = counts.filter(x => x.value !== null).map(x => x.value);
    const avg = knownValues.length ? (knownValues.reduce((a, b) => a + b, 0) / knownValues.length) : Infinity;
    const avgText = Number.isFinite(avg) ? avg.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1') : '—';
    const avgCell = anyFail ? `<fail>${avgText}</fail>` : avgText;

    return { libName, nameCell, counts, avg, anyFail, avgCell };
  });

  rows.sort((a, b) => {
    if (a.anyFail !== b.anyFail) return a.anyFail ? 1 : -1;
    return a.avg - b.avg;
  });

  const header = `| Library | ${machineSlugs.map(s => machines[s].title.split(' ')[0]).join(' | ')} | Avg |`;
  const divider = `| ---- | ${machineSlugs.map(() => '----').join(' | ')} | ---- |`;
  const body = rows.map(r => `| ${r.nameCell} | ${r.counts.map(c => c.text).join(' | ')} | ${r.avgCell} |`).join('\n');

  return [`<span id="quicktab">`, '', header, divider, body, '', `</span>`].join('\n');
}
```

- [ ] **Step 4: Run tests, expect pass**

Run: `npx jest src/ts/tests/build_shootout.spec.ts -c jest-spec.config.cjs`
Expected: 15 passing total.

- [ ] **Step 5: Commit**

```
git add src/buildjs/build_shootout.mjs src/ts/tests/build_shootout.spec.ts
git commit -m "feat(comparables): render top summary table from entry data"
```

---

## Task 20: Per-machine sections and full document assembly

**Files:**
- Modify: `src/buildjs/build_shootout.mjs`
- Modify: `src/ts/tests/build_shootout.spec.ts`

- [ ] **Step 1: Write failing tests**

Add to `build_shootout.spec.ts`:

```typescript
import { renderMachineSection, renderGenerated } from '../../buildjs/build_shootout.mjs';

describe('build_shootout: renderMachineSection', () => {
  it('emits ## title, blurb, per-machine table, and each entry', async () => {
    const { machines, entries } = await loadAll(path.resolve(__dirname, '..', '..', 'comparables'));
    const toggleEntries = entries.filter(e => e.machine === 'toggle');
    const md = renderMachineSection('toggle', machines.toggle, toggleEntries);
    expect(md).toMatch(/^## Toggle machine/m);
    expect(md).toContain(machines.toggle.blurb.split('\n')[0]);
    // Per-machine table present
    expect(md).toMatch(/\| lib \| length \|/);
    // Every toggle entry's heading appears
    for (const e of toggleEntries) {
      expect(md).toMatch(new RegExp(`### .*\`${e.library.name}\` Toggle machine`));
    }
  });
});

describe('build_shootout: renderGenerated', () => {
  it('returns a single string starting with the quicktab and ending with the last machine section', async () => {
    const { machines, entries } = await loadAll(path.resolve(__dirname, '..', '..', 'comparables'));
    const md = renderGenerated(machines, entries);
    expect(md).toContain('<span id="quicktab">');
    expect(md).toContain('## Toggle machine');
    expect(md).toContain('## Traffic light');
    expect(md).toContain('## States of Matter');
  });
});
```

- [ ] **Step 2: Run, confirm failure, implement**

Append to `src/buildjs/build_shootout.mjs`:

```javascript
export function renderMachineSection(slug, machineMeta, entries) {
  const machineEntries = entries.filter(e => e.machine === slug);

  // Per-machine table: rows sorted by lines asc, fails to end
  const sorted = [...machineEntries].sort((a, b) => {
    if (a.canImplement !== b.canImplement) return a.canImplement ? -1 : 1;
    return a.lines - b.lines;
  });

  const tableRows = sorted.map(e => {
    const anchor = anchorFor(e, machineMeta);
    const nameCell = e.canImplement ? e.library.name : `<fail>${e.library.name}</fail>`;
    const numCell = e.official ? `**[${e.lines}](#${anchor})**` : `[${e.lines}](#${anchor})`;
    return `| ${nameCell} | ${e.canImplement ? numCell : `<fail>${numCell}</fail>`} |`;
  }).join('\n');

  const sections = sorted.map(e => renderEntry(e, machineMeta)).join('\n\n&nbsp;\n\n');

  return [
    `## ${machineMeta.title}`,
    '',
    machineMeta.blurb,
    '',
    '| lib | length |',
    '| ---- | ---- |',
    tableRows,
    '',
    '&nbsp;',
    '',
    sections
  ].join('\n');
}

export function renderGenerated(machines, entries) {
  const parts = [renderQuickTab(machines, entries), '', '&nbsp;', ''];
  for (const slug of Object.keys(machines)) {
    parts.push(renderMachineSection(slug, machines[slug], entries));
    parts.push('');
    parts.push('&nbsp;');
    parts.push('');
  }
  return parts.join('\n');
}
```

- [ ] **Step 3: Run tests, expect pass**

Run: `npx jest src/ts/tests/build_shootout.spec.ts -c jest-spec.config.cjs`
Expected: 17 passing total (3 loader + 3 validation-failure + 5 renderEntry + 4 renderQuickTab + 2 from this task).

- [ ] **Step 4: Commit**

```
git add src/buildjs/build_shootout.mjs src/ts/tests/build_shootout.spec.ts
git commit -m "feat(comparables): render per-machine sections and full generated body"
```

---

## Task 21: Marker splice + CLI entry point

**Files:**
- Modify: `src/buildjs/build_shootout.mjs`
- Modify: `src/ts/tests/build_shootout.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { spliceMarkers } from '../../buildjs/build_shootout.mjs';

describe('build_shootout: spliceMarkers', () => {
  it('replaces content between START and END markers, preserving outside text', () => {
    const before = [
      '# Title',
      'Intro prose',
      '<!-- COMPARABLES:GENERATED-START -->',
      'OLD CONTENT',
      '<!-- COMPARABLES:GENERATED-END -->',
      'After'
    ].join('\n');
    const out = spliceMarkers(before, 'NEW CONTENT');
    expect(out).toContain('# Title');
    expect(out).toContain('Intro prose');
    expect(out).toContain('NEW CONTENT');
    expect(out).not.toContain('OLD CONTENT');
    expect(out).toContain('After');
  });

  it('throws if the start marker is missing', () => {
    expect(() => spliceMarkers('no markers here', 'x'))
      .toThrow(/markers missing/i);
  });
});
```

- [ ] **Step 2: Run, fail, implement**

Append to `src/buildjs/build_shootout.mjs`:

```javascript
export function spliceMarkers(existing, generated) {
  const startIdx = existing.indexOf(START_MARKER);
  const endIdx   = existing.indexOf(END_MARKER);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`markers missing from Shootout.md (looked for "${START_MARKER}" and "${END_MARKER}")`);
  }
  const startLineEnd = existing.indexOf('\n', startIdx);
  const before = existing.slice(0, startLineEnd + 1);
  const after  = existing.slice(endIdx);
  return `${before}\n${generated}\n\n${after}`;
}

// CLI
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const { machines, entries } = await loadAll();
  const existing  = await readFile(shootoutPath, 'utf8');
  const generated = renderGenerated(machines, entries);
  const next      = spliceMarkers(existing, generated);
  const { writeFile } = await import('node:fs/promises');
  await writeFile(shootoutPath, next, 'utf8');
  console.log(`Wrote ${shootoutPath} (${entries.length} entries, ${Object.keys(machines).length} machines)`);
}
```

(The `import.meta.url === ...` check is the ESM equivalent of `require.main === module`; the Windows path normalization handles `file://C:/...` vs `file://C:\...`.)

- [ ] **Step 3: Run tests, expect pass**

Expected: 19 passing total (17 prior + 2 from this task).

- [ ] **Step 4: Commit**

```
git add src/buildjs/build_shootout.mjs src/ts/tests/build_shootout.spec.ts
git commit -m "feat(comparables): splice generated content into Shootout.md markers"
```

---

## Task 22: Wire build:shootout into package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add the npm script**

In the `"scripts"` block, add after the `"docs"` line:

```
"build:shootout": "node src/buildjs/build_shootout.mjs",
```

- [ ] **Step 2: Make `docs` depend on `build:shootout`**

Change the existing `"docs"` script from:
```
"docs": "typedoc src/ts/jssm.ts src/ts/jssm_viz.ts src/ts/jssm_types.ts src/ts/jssm_constants.ts src/ts/jssm_error.ts src/ts/jssm_util.ts src/ts/version.ts --options typedoc-options.cjs",
```
to:
```
"docs": "npm run build:shootout && typedoc src/ts/jssm.ts src/ts/jssm_viz.ts src/ts/jssm_types.ts src/ts/jssm_constants.ts src/ts/jssm_error.ts src/ts/jssm_util.ts src/ts/version.ts --options typedoc-options.cjs",
```

Note: this adds a compound `&&` chain inside a JSON script entry. The user's memory rule "no compound commands" applies to *interactive* shell commands that trigger permission prompts — npm scripts execute non-interactively via `npm run` and do not. The `make` script already chains 20+ commands with `&&`, so this convention is established.

- [ ] **Step 3: Run the renderer once**

Run: `npm run build:shootout`
Expected: stdout `Wrote .../Shootout.md (30 entries, 3 machines)`.

- [ ] **Step 4: Diff against the prior Shootout.md**

Run: `git diff src/doc_md/Shootout.md`

This is the moment of truth. The generated output will not be byte-identical to the hand-edited original — line spacing, exact phrasing of "(created)" prose, and the source-URL formatting differ. Read the diff carefully:

- **Acceptable differences:** whitespace, link anchor casing, blank-line counts, slight changes in how source URLs are formatted.
- **Unacceptable differences:** any code block missing, any line count changed, any library missing, any heading text whose anchor would break inbound links.

If any code block was extracted incorrectly (mismatched line count, code drift), the renderer's validation would have failed at Step 3 — so Step 3 passing means all code is at least internally consistent. If the diff reveals a content problem (e.g. a `<fail>` wrap missing), go back to the corresponding per-library extraction task and correct the JSON.

- [ ] **Step 5: Reconcile and commit**

If the diff shows only acceptable formatting differences, commit:

```
git add package.json src/doc_md/Shootout.md
git commit -m "feat(comparables): wire build:shootout into docs build; regenerate Shootout.md"
```

If the diff shows content problems, fix the underlying JSON, re-run `npm run build:shootout`, and re-diff. Only commit once the diff is clean.

---

## Task 23: IDE diagnostics check + final verification

**Files:** none (verification only)

- [ ] **Step 1: Check IDE diagnostics on all modified files**

Per the user's memory rule (`feedback_check_ide_diagnostics`), call `mcp__ide__getDiagnostics` on each file modified or created:
- `src/buildjs/build_shootout.mjs`
- `src/ts/tests/build_shootout.spec.ts`
- `src/comparables/schema.json`
- `src/comparables/machines.json`
- The 30 per-library JSON files (one diagnostic call covers the whole directory if the IDE supports it)
- `src/doc_md/Shootout.md`
- `package.json`

Resolve any warnings before declaring done.

- [ ] **Step 2: Run the full spec test suite**

Run: `npm run jest-spec`
Expected: all existing tests still pass, plus the 20 new ones in `build_shootout.spec.ts`.

- [ ] **Step 3: Run the renderer in dry-run-equivalent mode**

Run: `npm run build:shootout`
Expected: zero output diff against the just-committed Shootout.md (rerunning should be idempotent).

Verify: `git diff src/doc_md/Shootout.md` produces no output.

- [ ] **Step 4: Sanity-check FSL-site consumability**

Read one JSON file end-to-end (e.g. `src/comparables/toggle/xstate.json`) and confirm it is self-contained — a consumer with no other file in hand can render a complete entry from it alone.

- [ ] **Step 5: Final commit (if any cleanup needed)**

If the diagnostics / verification steps surfaced fixes, commit them with a descriptive message. Otherwise no commit needed.

---

## Notes for the executing agent

- The research output lives at `notes/comparables-research.md` after Task 5 — read it at the start of Tasks 6–15 to get `library.languages`, `library.homepage`, and optional `typesSource` per library.
- Tasks 6–15 are independent of each other: a parallel subagent dispatcher can run them concurrently. Tasks 16+ depend on the 30 JSON files being in place.
- The renderer cross-checks `lines === code.split('\n').length`; a wrong `\n` escape in any JSON file surfaces here, not silently.
- If `npm run build:shootout` in Task 22 fails because the `&&` chain in the `docs` script is rejected by some shell, the fallback is a Node-level `npm run` shim or a small wrapper script. The chain itself is conventional (the existing `make` script uses dozens of them) and should work.
