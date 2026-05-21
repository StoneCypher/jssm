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
