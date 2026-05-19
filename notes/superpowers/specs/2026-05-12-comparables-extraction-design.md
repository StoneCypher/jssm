# Comparables extraction — design spec

**Date:** 2026-05-12
**Topic:** Extract the cross-library FSM examples currently inlined in `src/doc_md/Shootout.md` into structured JSON under `src/comparables/`, so multiple websites (the jssm typedoc site today; the FSL site and future code-generator targets next) can build their comparison pages from one source of truth.

---

## 1. Background

`src/doc_md/Shootout.md` (956 lines) is a hand-edited comparison page. It contains:

- An intro section (lines 1–26) describing methodology and how to read the tables.
- A top-level summary table mapping each library × each comparison machine to a line count, with bold for official-upstream code, non-bold for jssm-author-synthesized code, and `<fail>red and italic</fail>` for libraries that cannot correctly implement the machine.
- Three per-machine sections (Toggle, Traffic light, States of matter), each with a per-machine summary table and one heading + prose note + code fence per library entry.

Ten libraries appear in Shootout today: `jssm`, `xstate`, `javascript-state-machine`, `state-machine`, `nanostate`, `machina`, `finity`, `stately`, `robot`, `faste`. All examples are currently JavaScript.

The data is consumed by exactly one site (the jssm typedoc-rendered docs). Reuse for the FSL site or for future code generators currently requires either copy-pasting Shootout.md or scraping its markdown — both fragile.

## 2. Goals

1. Move per-(library, machine) example data out of Shootout.md and into structured JSON files at a stable path in the source tree.
2. Annotate each library with the target languages its host project supports (researched per library, not assumed). All current examples are written in JavaScript; the data must distinguish between "this *example* is in language X" and "this *library* supports languages X, Y".
3. Build a renderer that regenerates the body of Shootout.md from the JSON so the existing jssm docs site keeps working without manual maintenance of two sources.
4. Keep the data shape extensible toward non-JS ports (TypeScript first, then WebAssembly / Python / other code-generator targets later) without rework.

## 3. Non-goals

- Building the FSL site or code-generator integrations. This spec produces the data; downstream consumers come later.
- Adding new libraries or new comparison machines to the dataset beyond what already exists in Shootout.md.
- Refactoring Shootout.md's hand-edited intro prose or the FeatureComparison.md table.

## 4. Layout

```
src/comparables/
  README.md            schema overview, how to add a library/machine
  schema.json          JSON Schema for per-library files
  machines.json        machine-level metadata (title, blurb, display order)
  toggle/
    jssm.json
    xstate.json
    machina.json
    stately.json
    robot.json
    finity.json
    faste.json
    nanostate.json
    javascript-state-machine.json
    state-machine.json
  traffic-light/
    (same set of files)
  matter/
    (same set of files)
```

**Machine slugs** (directory names): `toggle`, `traffic-light`, `matter`. Lowercased, hyphenated, stable. The renderer maps these to display titles via `machines.json`.

**Library slugs** (filenames): the npm package name verbatim, lowercased. Matches what Shootout's table column uses as canonical identifier; predictable for downstream URL fetching.

**Forward extension for non-JS ports:** add `<library>.<language>.json` siblings, e.g. `xstate.ts.json` for a TypeScript port. The unsuffixed form (`xstate.json`) is implicitly the JavaScript port. The `language` field inside the file is the disambiguator; the suffix exists only because the filesystem cannot hold two files of the same name. No directory restructuring needed when this extension activates.

## 5. Per-library file schema

```jsonc
{
  "library": {
    "name":      "xstate",
    "npm":       "xstate",
    "homepage":  "https://xstate.js.org",
    "languages": ["javascript", "typescript"]
  },

  "machine":  "toggle",
  "language": "javascript",
  "lines":    16,

  "official":     true,
  "canImplement": true,

  "source": {
    "url":  "https://xstate.js.org/docs/recipes/svelte.html#machine-js",
    "note": "From their documentation"
  },

  "code": "export const toggleMachine = createMachine({\n  id: \"toggle\",\n  ...\n});",

  "formattedWith": "prettier"
}
```

| field | type | required | meaning |
|---|---|---|---|
| `library.name` | string | yes | display name |
| `library.npm` | string | yes | npm package id (matches filename minus extension and optional language suffix) |
| `library.homepage` | string (URL) | yes | canonical project URL |
| `library.languages` | array of strings | yes | target languages the **host library** supports, researched per library |
| `library.typesSource` | string | no | only present when library lacks first-party types but has community types (e.g. `"@types/machina"`) |
| `machine` | string | yes | machine slug; must match parent directory name |
| `language` | string | yes | language **this specific example** is written in (today: always `"javascript"`) |
| `lines` | integer ≥ 1 | yes | line count for the table; cross-checked against `code` by renderer |
| `official` | boolean | yes | `true` if drawn from the library's own docs or examples; `false` if synthesized for this comparison (the "(created)" prefix in Shootout) |
| `canImplement` | boolean | yes | `false` if the library cannot correctly implement this machine (the `<fail>` cells in Shootout) |
| `source.url` | string (URL) | no | citation link from the original prose |
| `source.note` | string | no | the hand-written prose annotation above the code in Shootout (e.g. "Finity did not have a light switch example. I made this following…") |
| `code` | string | yes | example body, newlines as `\n` |
| `formattedWith` | string \| null | no | usually `"prettier"`; omitted/null for finity which Shootout explicitly leaves unformatted |

`library.languages` accepted values today: `"javascript"`, `"typescript"`, `"webassembly"`. The JSON Schema enum lists exactly these three; admitting new languages (e.g. `"python"`, `"rust"`) is a deliberate two-line edit to `schema.json` when the first code-generator target lands, not an open registry. The `language` field on an example must be a member of the host library's `languages` array.

## 6. Machine metadata file

`src/comparables/machines.json` carries display data that today is hand-baked into Shootout.md as section headers and intro sentences:

```jsonc
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

Titles and blurbs are taken verbatim from Shootout.md's existing section headers and intro paragraphs (lines 51–55, 270–276, 575–581). Insertion order in the JSON object defines display order in the summary tables and the section sequence in the rendered markdown.

## 7. Renderer

**Location:** `src/buildjs/build-shootout.mjs` (Node ESM).

**Invocation:** `npm run build:shootout`. Wired as a prerequisite of whichever existing doc-build task produces the jssm typedoc site.

**Behavior:**

1. Load and validate `schema.json`, `machines.json`, and every `src/comparables/*/*.json` file.
2. For each library file: validate against `schema.json`; verify `machine` matches the parent directory name; verify `lines` matches `code.split('\n').length`; verify `language` is in `library.languages`.
3. Compute the top summary table: rows = libraries, columns = machines (in `machines.json` order) + an average column. Cells are line counts formatted with `**bold**` when `official === true` and with `<fail>...</fail>` wrap when `canImplement === false`. Rows sort by average ascending; rows with any `canImplement: false` cell sort to the end (matching Shootout's existing convention).
4. Compute per-machine summary tables.
5. For each (machine, library) example: emit a section heading (`### \`<lib>\` <machine title>, <N> lines` or `### (created) \`<lib>\` …` if `!official`), the `source.note` and `source.url` prose if present, and a fenced ```language``` code block.
6. Splice the rendered output into `src/doc_md/Shootout.md` between `<!-- COMPARABLES:GENERATED-START -->` and `<!-- COMPARABLES:GENERATED-END -->` markers. Everything outside the markers is preserved verbatim.

**Failure modes — the renderer exits non-zero and writes nothing if:**

- a per-library file fails schema validation (report file path + JSON pointer + rule)
- `lines` disagrees with counted lines in `code` (report both numbers and the file)
- the parent directory of a library file is not a key in `machines.json`
- a library file's `machine` field doesn't match its parent directory
- `language` is not in `library.languages`
- the markers are missing from `Shootout.md`

**Warning (not error):** a library appearing in one machine dir but not another. Logged to stderr; the row in the top table shows an empty cell for the missing machine. (This is the path by which an upstream library may eventually add an example for a machine it previously skipped.)

## 8. Language-target research

Per the user's requirement, `library.languages` is researched per library, not assumed. Methodology:

1. **Ships own types:** check the published npm tarball or the package's `package.json` for `types`/`typings` field, or `.d.ts` files in the publish output. → `"typescript"`.
2. **Community types fallback:** if no first-party types, check npm for `@types/<package>`. → `"typescript"` plus `library.typesSource: "@types/<package>"`.
3. **Non-JS hosts:** scan README and project page for wasm builds, Deno-native variants, or other-language ports. Add `"webassembly"` etc. as applicable.

Expected priors (to be verified, not trusted), all libraries get `"javascript"` at minimum:

| library | expected |
|---|---|
| jssm | `[javascript, typescript]` (TS-authored, ships .d.ts) |
| xstate | `[javascript, typescript]` (TS-first project) |
| robot | `[javascript, typescript]` (TS in source) |
| faste | `[javascript, typescript]` (TS-authored) |
| machina | `[javascript]` (check @types/machina) |
| javascript-state-machine | `[javascript]` (check community types) |
| state-machine | `[javascript]` |
| stately | `[javascript]` |
| nanostate | `[javascript]` |
| finity | `[javascript]` (check) |

## 9. Testing

The renderer needs tests. Per repo convention (no golden-file / snapshot tests, no characterization tests for bugs):

- **Substring assertions** on rendered markdown output: e.g. the summary table contains "xstate", the code fence for the jssm toggle entry contains `<=> 'TOGGLE'`, a `canImplement: false` row contains `<fail>`.
- **Structural assertions** keyed by JSON input: for each (machine, library) input file, locate its rendered section by its heading, then assert the section's code fence contains that file's `code` field as a substring. Failure surfaces a missing/corrupted entry without storing a fragile snapshot of the whole document.
- **Validation tests** with synthetic inputs: feed the renderer a deliberately broken file (mismatched `lines`, unknown machine slug, language not in `library.languages`, missing markers in `Shootout.md`, etc.) and assert it exits non-zero with a message naming the file and the rule.

Tests check that specific identifiers, line counts, and structural markers appear where expected; no test stores or compares against an exact rendering of a multi-line block.

## 10. Out of scope but worth noting

- **Migrating FeatureComparison.md to JSON** — the feature-matrix table in `src/doc_md/FeatureComparison.md` covers 16 libraries × N features. Same general extraction pattern applies but the data is structurally different (boolean grid, not code snippets). Future work.
- **Wiring the FSL site to consume `src/comparables/`** — that's a separate task in the FSL repo, not this one.
- **Code generators emitting new languages** — the schema is built to accept them; the actual generators are far-future work.

## 11. Risks and mitigations

| risk | mitigation |
|---|---|
| Line counts in Shootout's existing table disagree with the actual code blocks. | Renderer cross-checks at build time; first run may surface existing mismatches that need to be reconciled before the renderer is wired into the doc build. |
| Library research for `languages` is wrong (e.g. claims TS support a library doesn't have). | Verify against npm registry and the project's GitHub during extraction; cite source in commit message for each library file. |
| Marker comments accidentally deleted from Shootout.md during a future hand-edit of the intro. | Renderer fails loudly with "markers missing from Shootout.md"; README documents the markers. |
| A library file's `npm` field drifts from its filename. | Validation rule: `<filename without language suffix>` must equal `library.npm`. |
