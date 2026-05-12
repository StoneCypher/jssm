# Cookbook authoring — for agents

This document tells Claude Code (and any future agent) **exactly** how to add a recipe to the fsl.tools cookbook. Read it before touching `recipes/` or `scripts/build.cjs`.

## TL;DR

1. Drop a new `recipes/<category>-<slug>.cjs` file.
2. Run `node scripts/build.cjs`.
3. Done. The recipe page, the cookbook index, the manifest, and (if it's a triple) the triples picker all update.

No SPA. No React on the recipe pages. Output is a folder of plain `.html` files.

---

## The repository layout

```
recipes/                         ← SOURCE: one file per recipe
  patterns-toggle.cjs
  patterns-cycle.cjs
  hooks-entry.cjs
  test-vitest-vite-react.cjs      ← TRIPLES (see below)
  test-jest-webpack-vue.cjs
  ...

scripts/
  build.cjs                       ← `node scripts/build.cjs` — produces /cookbook/**
  templates/
    recipe.html                  ← per-recipe shell (header / footer / TOC scaffold)
    index.html                   ← /cookbook/index.html shell
    triples.html                 ← /cookbook/test/index.html shell

cookbook/                        ← BUILD OUTPUT — do not hand-edit
  patterns-toggle.html
  test-vitest-vite-react.html
  index.html
  test/index.html                ← triples picker
  manifest.json                  ← {recipes: [...], tags: [...], categories: [...]}
  cookbook.css

components/                      ← used by the homepage SPA only
index.html                       ← homepage SPA — Examples cards link into /cookbook/
colors_and_type.css              ← design tokens, shared by both worlds
```

The homepage (`index.html`) is still a small React app. The cookbook is **plain static HTML** so it scales to thousands of pages and Google can index every one.

---

## Filename → URL convention

```
recipes/<category>-<slug>.cjs     →     /cookbook/<category>-<slug>.html
```

The filename **is** the URL. Pick it carefully — it never changes.

- `category` is a single word, lowercased, kebab-cased if needed (`patterns`, `hooks`, `errors`, `workflows`, `test`, `integrations`).
- `slug` is whatever uniquely identifies this recipe within its category.

### Triples (testing × bundler × frontend)

Triples are normal recipes with a fixed slug shape:

```
recipes/test-<runner>-<bundler>-<frontend>.cjs
```

- `runner` ∈ {`vitest`, `jest`, `playwright`, `cypress`, `mocha`, `node`}
- `bundler` ∈ {`vite`, `webpack`, `esbuild`, `rollup`, `parcel`, `turbopack`, `bun`, `none`}
- `frontend` ∈ {`react`, `vue`, `svelte`, `solid`, `preact`, `angular`, `lit`, `vanilla`}

The build script recognizes the `test-` prefix and adds the recipe to the triples picker at `/cookbook/test/index.html`. Each axis value is also auto-tagged on the recipe.

If you need a fourth axis later (e.g. TS vs JS), append it: `test-vitest-vite-react-ts.cjs`. Update the `parseTripleSlug` function in `scripts/build.cjs` to match.

---

## Recipe file format

A recipe is a plain ES module exporting a single object as `module.exports`. **No imports, no dependencies, no JSX.** Just a data record.

```js
// recipes/patterns-toggle.cjs
module.exports = {
  // REQUIRED
  title: 'Toggle',
  category: 'Patterns',                // free-form, but pick from the existing set when possible
  problem: 'Two states, one verb. The smallest useful machine — and the one you reach for whenever a boolean has started growing edge cases.',

  // OPTIONAL
  tags: ['boolean', 'two-state', 'beginner'],
  blocks: [
    {
      kind: 'fsl',                     // see "Code block kinds" below
      title: 'machine.fsl',             // optional, shows in the block header
      code: `import { sm } from 'jssm';

const panel = sm\`
  closed 'toggle' → open;
  open   'toggle' → closed;
\`;

panel.go('toggle');
panel.state(); // → 'open'
`,
    },
  ],
  graph: {                              // optional — see "Graphs" below
    width: 520,
    height: 140,
    accentNode: 'closed',
    nodes: [
      { id: 'closed', x: 150, y: 70 },
      { id: 'open',   x: 370, y: 70 },
    ],
    edges: [
      { from: 'closed', to: 'open',   label: 'toggle', curve: 'arc-up', arcOffset: 28 },
      { from: 'open',   to: 'closed', label: 'toggle', curve: 'arc',    arcOffset: 28 },
    ],
  },
  note: 'Reach for this whenever you find yourself adding a third boolean to a component. `open / opening / closed` is a different machine — and once you write it as one, the bugs go away.',

  // OPTIONAL — for triples only, this is auto-derived from the filename, but you can override
  triple: { runner: 'vitest', bundler: 'vite', frontend: 'react' },
};
```

### Required fields
- `title` — sentence-case, no trailing period.
- `category` — title-case, free-form. Existing values: `Patterns`, `Hooks`, `Errors`, `Persistence`, `React`, `Workflows`, `Testing`, `Integrations`. Add new ones freely.
- `problem` — one short paragraph. Markdown-light: `` `code` `` and `*emphasis*` are supported in `problem` and `note`.

### Code block kinds
Used for the small "FSL" / "TS" / "VITEST" badge at the top of each block, and as a hint to the highlighter. Recognized values:

| `kind`        | Header label | Highlighter   |
|---------------|--------------|---------------|
| `fsl`         | FSL          | fsl           |
| `jssm`        | JSSM         | js            |
| `ts` / `tsx`  | TS / TSX     | js            |
| `js` / `jsx`  | JS / JSX     | js            |
| `react`       | REACT        | js            |
| `vitest`      | VITEST       | js            |
| `jest`        | JEST         | js            |
| `shell`       | SHELL        | shell         |
| `json`        | JSON         | json          |
| anything else | (uppercased) | plain         |

### Code block syntax conventions

The highlighter is heuristic, not a real parser. To make code render cleanly:

- Use `→` (U+2192) for FSL arrows when possible. `->` is also recognized.
- Comments starting with words like *no*, *refused*, *fail*, *error*, *cannot* render in mauve (refusal red).
- Comments containing `ok` or `→ ok` render in teal (accepted green).
- Strings (single, double, backtick) all colorize as accent (ochre).

### Graphs

Optional. Pure data — no SVG knowledge required. Coordinates are in pixels inside a viewBox of `width × height`.

- `nodes: [{ id, x, y, label? }]` — `label` defaults to `id`.
- `edges: [{ from, to, label?, curve?, arcOffset? }]`
  - `curve` ∈ `undefined` (straight) | `'arc'` (bend down) | `'arc-up'` (bend up) | `'self'` (loop on top of node).
  - `arcOffset` controls how pronounced the arc is; default 32.
- `accentNode: 'id'` highlights one node in teal as the entry point.

If laying out a graph by hand is annoying, just leave `graph` out — the recipe page will simply not show one. Better no graph than a tangled one.

### `note`

A short closing paragraph below the code/graph. Same Markdown-light rules as `problem`.

---

## Build script

```bash
node scripts/build.cjs
```

Reads every `recipes/*.cjs`, validates required fields, writes:

- `cookbook/<basename>.html` — one per recipe.
- `cookbook/index.html` — searchable list of all recipes (client-side filter on `manifest.json`).
- `cookbook/test/index.html` — triples picker (only if any `test-*` recipes exist).
- `cookbook/manifest.json` — `{recipes: [...summary...], tags: [...], categories: [...]}`.
- `cookbook/cookbook.css` — shared stylesheet.

The script is **zero-dependency**. It uses only Node's built-in `fs`, `path`, and `module` (to `require()` recipe files).

### Validation

The build refuses to run if any recipe is missing `title`, `category`, or `problem`. Triple recipes (`test-*`) additionally fail if their slug doesn't parse into a `runner-bundler-frontend` triple.

### Re-running

Idempotent. Safe to run on every save. The output folder can be wiped (`rm -rf cookbook/`) and re-built from scratch.

---

## What you should NOT touch

- `cookbook/**` — generated output. If you change something here, the next build wipes it.
- `components/cookbook-data.jsx`, `components/Cookbook*.jsx` — these belong to the old SPA and will be removed once the static site is canonical. Don't extend them.

## What you SHOULD touch

- `recipes/*.cjs` — add freely.
- `scripts/templates/*.html` — change the per-recipe page chrome here, not by editing the generated HTML.
- `scripts/build.cjs` — extend when you need new code-block kinds, new categories with custom rendering, or a new top-level page (e.g. an integrations matrix).
- This file (`AGENTS.md`) — keep in sync with reality.

---

## Common tasks

### Add a new pattern
1. `recipes/patterns-debounce.cjs` with the schema above.
2. `node scripts/build.cjs`.

### Add the testing triple for vitest × vite × react
1. `recipes/test-vitest-vite-react.cjs`. The build infers the triple from the filename.
2. `node scripts/build.cjs`. The recipe appears at `/cookbook/test-vitest-vite-react.html` AND in the picker at `/cookbook/test/index.html`.

### Add a whole new category
Just use it as the `category` field. The index page groups by category alphabetically; nothing else to do.

### Add a new code-block kind (e.g. `python`)
Edit `scripts/build.cjs`:
- Add the kind to the `KIND_LABELS` map.
- If the highlighter should treat it specially, extend the `highlight()` function. Otherwise it falls through to the plain renderer.
