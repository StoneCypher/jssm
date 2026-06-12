# FSL parser source locations + CM6 editor diagnostics — design

**Date:** 2026-06-07
**Status:** Approved (design phase). Awaiting implementation plan.
**Author:** John Haugeland

## Motivation

The FSL parser (`src/ts/fsl_parser.peg`, compiled to `src/ts/fsl_parser.ts`)
produces an AST of plain value objects that carry **no source positions**. Its
action blocks return shapes like `{ key: 'transition', from: 'a', se: { kind:
'->', to: 'b' } }` and discard where in the source each piece came from.

This blocks the CM6 editor work (see
`notes/superpowers/specs/2026-05-12-editor-widget-packaging-design.md` and
`notes/superpowers/cm6-editor-handoff.md`) from offering **precise
diagnostics**. Two distinct error classes exist today:

1. **Parse errors** — pegjs already throws a `SyntaxError` carrying a
   `.location`. The sketch linter (`sketch/cm6-editor/editor.js`) already maps
   these to CM6 diagnostics. *These need nothing from this work.*
2. **Semantic / validation errors** — raised by `compile()`
   (`src/ts/jssm_compiler.ts`): "Cannot repeat property definitions", "May only
   have one *X* statement", "A state may only bind a property once", "State
   declarations must have a name". These throw `JssmError` with **no position**,
   and the current linter does not even call `compile()`, so a string that
   parses but fails to compile shows "parses cleanly" in the editor and only
   fails later at machine construction.

This design adds opt-in source locations to the parser AST, threads them into
`compile()`'s semantic errors, and rewrites the sketch linter to run
parse → compile and surface both error classes as precise, correctly-positioned
diagnostics.

This is explicitly **not** an attempt to drive syntax highlighting from the
AST. PEG has no error recovery (one bad keystroke fails the whole parse), is not
incremental, and discards comments/whitespace — so AST-driven highlighting is
strictly worse for a live editor than the existing `StreamLanguage` tokenizer in
`sketch/cm6-lang-fsl/`. Locations serve **diagnostics and (future) semantic
navigation**, complementing the tokenizer rather than replacing it.

## Goals

- `parse(input, { locations: true })` annotates AST nodes with source spans.
- The **default** output of `parse(input)` / `parse(input, {})` is **byte-for-byte
  unchanged** — no new keys — so the existing parse-tree equality tests and the
  public `parse()` contract are untouched, and machine construction pays zero
  added cost.
- Every **object** node in the AST carries a `loc` when locations are enabled
  (Approach A). Primitive leaves stay bare; their position is recoverable from
  the enclosing object's `loc`.
- A curated set of high-value leaves additionally carries an exact sub-span
  (Approach C): state names, transition source/target labels, machine-attribute
  values, action labels, and color values.
- `compile()` attaches the offending node's span to each semantic `JssmError`
  when locations are present; behaves exactly as today when they are not.
- The sketch CM6 linter runs parse → compile and maps pegjs `SyntaxError`
  locations **and** `JssmError` locations to CM6 diagnostics, with a
  document-level fallback for node-less compile errors.

## Non-goals

- **AST-driven syntax highlighting.** Out of scope by design (see Motivation).
  The `StreamLanguage` tokenizer remains the highlighting source of truth.
- **Boxing primitive leaves** into `{ value, loc }` (the rejected "Approach B").
  It would change the AST *shape*, fighting the opt-in decision and forcing every
  value-reader in both the grammar and `compile()` to unwrap. High risk, low
  marginal value over A+C.
- **Semantic navigation features** (hover, go-to-definition, outline, rename).
  These consume locations but are a later editor plan.
- **Promoting the sketch to production `src/`.** The linter changes stay in
  `sketch/cm6-editor/`; only a pure, testable helper is extracted.
- **Incremental / error-recovering parsing.** Not changing the parser's
  whole-document, fail-fast nature.

## Decisions

| Topic | Decision |
|---|---|
| Activation | Opt-in via `parse(input, { locations: true })`. Default output unchanged. |
| Node coverage | Every **object** node gets `loc` (Approach A) + curated leaf sub-spans (Approach C). |
| Primitive leaves | Stay bare. No boxing. Position derived from enclosing object. |
| `loc` shape | pegjs-native `location()` object: `{ start: { offset, line, column }, end: { offset, line, column } }`. Lossless; `offset` feeds CM6 directly. |
| Sub-span field naming | Sibling fields on the parent object: `name_loc`, `value_loc`, `action_loc`, `to_loc`, `from_loc` (only when locations enabled). |
| Compiler output | Unchanged. `compile()` ignores `loc`; the built `Machine` is identical. |
| Error location channel | New optional `source_location` on `JssmErrorExtendedInfo`; surfaced as a public `source_location` field on `JssmError`. |
| Error message strings | **Unchanged.** Location rides in a side field, so existing error-message assertions don't churn. |
| Linter shape | Extract a pure `diagnosticsFor(text)` helper (no DOM) from the sketch so the mapping logic is unit-testable headlessly. |
| Test style | Offset-slice assertions (slice source by span, compare to expected token). No golden/snapshot. Stochastic well-formedness checks. |

## Architecture

Five touch points, in dependency order. Each is independently understandable and
testable.

### 1. Grammar — `src/ts/fsl_parser.peg`

pegjs exposes `options` (the second argument to `parse`) and `location()` inside
every action block. The default library path reaches the parser through
`wrap_parse(plan)` (`jssm_compiler.ts:174`) with **no** options, so
`options.locations` is falsey and nothing changes.

**Approach A — object nodes.** Each action block that returns an object literal
gains, immediately before `return`:

```js
if (options.locations) { node.loc = location(); }
```

applied uniformly across the object-returning rules (transitions/`Subexp`/`Exp`,
state declarations and their items, machine attributes, config blocks, property
definitions, named lists, arrange declarations, arrow decorations, etc.).

**Approach C — curated leaf sub-spans.** For the leaves diagnostics most want to
underline, capture an exact sub-span into a sibling field on the parent object,
using a `location()`-gated inline sub-rule so the no-locations shape is
untouched. Pattern:

```pegjs
MachineName
  = WS? "machine_name" WS? ":" WS?
    value:( v:Label { return options.locations ? { __v: v, __loc: location() } : v; } )
    WS? ";" WS? {
      const raw  = options.locations ? value.__v : value;
      const node = { key: "machine_name", value: raw };
      if (options.locations) { node.loc = location(); node.value_loc = value.__loc; }
      return node;
    }
```

Curated sub-span set:

- **State names** — `StateDeclaration` name (`name_loc`).
- **Transition source/target labels** — `Exp` `from` (`from_loc`) and `Subexp`
  `to` (`to_loc`).
- **Machine-attribute values** — the `value` of each `MachineAttribute` rule
  (`value_loc`).
- **Action labels** — `ArrowDecoration`'s `ActionLabel` (`action_loc`), threaded
  through `Subexp`'s decoration flattening onto `l_action_loc` / `r_action_loc`.
- **Color values** — the `value` of color-bearing state/edge items (`value_loc`).

The exact per-rule edit list is enumerated in the implementation plan.

**Build note:** the parser is generated (`npm run peg` → pegjs →
`src/buildjs/fixparser.cjs`). Edits go in the `.peg`; the committed
`fsl_parser.ts` is regenerated. `fixparser.cjs` already marks
`error`/`expected`'s `location` parameter optional — no change needed there.

### 2. Types — `src/ts/jssm_types.ts`

- Define and export `FslSourceLocation`:

  ```ts
  type FslSourcePoint    = { offset: number; line: number; column: number };
  type FslSourceLocation = { start: FslSourcePoint; end: FslSourcePoint };
  ```

- Add optional `loc?: FslSourceLocation` and the relevant `*_loc?:
  FslSourceLocation` fields to the parse-tree node types
  (`JssmParseTree` element types, `JssmCompileSe`, `JssmCompileSeStart`, the
  transition/declaration/attribute node shapes). All optional → additive.
- Add optional `source_location?: FslSourceLocation` to
  `JssmErrorExtendedInfo`.

### 3. Compiler — `src/ts/jssm_compiler.ts`

`compile()` stays field-name-driven: it reads `rule.key` / `rule.value` /
`rule.name` / `rule.se` by name and builds fresh `edge` objects in
`makeTransition` (`jssm_compiler.ts:64`). Located nodes therefore pass through
harmlessly and the compiled config / `Machine` is identical — *verified against
the current control flow.*

The change is at the `throw new JssmError(undefined, msg)` sites that are tied to
a specific node. Each gains `{ source_location: node.loc }` as the third
argument:

- "Cannot repeat property definitions" → the duplicate definition's `loc`.
- "May only have one *X* statement" → the **second** occurrence's `loc`.
- "A state may only bind a property once" / "State declarations must have a
  name" → the declaration's `loc`.

Pointing at the *second* occurrence requires retaining node references through
the `results` accumulator (today it concats `rule.value` and drops node
identity — `jssm_compiler.ts:436-444`, `462-478`). This is a contained refactor:
keep the located node alongside its aggregated value for the one-only/duplicate
checks. When locations are absent (normal `make()`), `node.loc` is `undefined`
and the error carries no location — today's behavior exactly.

### 4. Error — `src/ts/jssm_error.ts`

`JssmError` reads `source_location` from the `JEEI` argument and stores it as a
public `source_location: FslSourceLocation | undefined` field. The composed
`message` string is **left identical** (no location text appended), so existing
message assertions don't change. The linter reads `err.source_location`.

### 5. CM6 linter — `sketch/cm6-editor/editor.js`

Extract a pure helper:

```js
// returns CM6-style diagnostic objects ({ from, to, severity, message }),
// plus a status summary — no DOM access, unit-testable headlessly.
function diagnosticsFor(text) { /* parse({locations:true}) → compile → map */ }
```

The linter callback becomes a thin DOM wrapper around `diagnosticsFor` that also
updates the status bar. Mapping rules:

- **Success** (parse + compile): status "parses and compiles cleanly", `[]`.
- **pegjs `SyntaxError`** (`err.location` present): one diagnostic using
  `err.location.start.offset … end.offset` **directly** — this retires the
  `offsetFromLineCol` line/column reconstruction currently in the sketch.
- **`JssmError`**: if `err.source_location` present, a diagnostic at
  `start.offset … end.offset`; otherwise a document-level diagnostic
  (`from: 0, to: text.length`) carrying the message.

The sketch must now also import `compile` (exported from `jssm_compiler.ts`,
re-exported by the package root). The exact import specifier is resolved in the
plan; it parallels the existing
`import { parse } from "../../dist/es6/fsl_parser.js"`.

### Data flow

```
FSL text
 → parse(text, { locations: true })
       AST: object nodes carry `loc`; curated leaves carry `*_loc`
 → compile(tree)
       success        → config (loc ignored; Machine identical to today)
       semantic error → throw JssmError{ source_location: offendingNode.loc }
 → diagnosticsFor maps:
       pegjs SyntaxError.location  → diagnostic (offsets)
       JssmError.source_location   → diagnostic (offsets); else whole-document
```

Library path (`sm` / `from` / `make` → `wrap_parse(plan)`, no options):
`options.locations` falsey → identical behavior, identical output, no added
parse cost.

## Error handling

- **Default / library path:** unchanged — no `loc` on nodes, `JssmError` with no
  `source_location`, identical message strings, identical `Machine`.
- **Editor path:** both parse errors and semantic errors become precise
  underlines. Compile errors with no associated node degrade gracefully to a
  document-level diagnostic rather than throwing or mispositioning.
- **Malformed-span safety:** the linter clamps spans to document bounds and
  ensures `to ≥ from + 1` (mirrors the existing sketch guard).

## Testing

Conventions: no golden/snapshot tests; offset-slice substring assertions;
stochastic where it adds power; unit (`*.spec.ts`) vs stochastic (`*.stoch.ts`)
kept in their respective places; never pin bugs.

- **Opt-in contract (guards the default shape):** `parse(x)` and `parse(x, {})`
  produce **no** `loc` / `*_loc` keys on any node. This protects the ~40 existing
  `parse().toEqual(...)` assertions, which must continue to pass unchanged.
- **Object-node locations:** `parse(x, { locations: true })` nodes carry `loc`;
  slicing the source by `loc.start.offset … loc.end.offset` yields the expected
  statement text.
- **Leaf sub-spans:** slice by each `*_loc` and assert it equals the leaf text
  (state name, transition target, attribute value, action label, color value).
- **Compiler error locations:** feed a string triggering each semantic error
  with `{ locations: true }`; assert the thrown `JssmError.source_location`
  slices to the offending statement. Without locations, assert `source_location`
  is `undefined` and the message is unchanged.
- **Linter logic:** unit-test `diagnosticsFor(text)` headlessly — a
  parseable-but-non-compiling string yields a diagnostic at the right offsets; a
  syntactically-invalid string yields the parse-error diagnostic; a valid string
  yields none.
- **Stochastic:** generate random valid FSL, parse with locations, assert every
  `loc`/`*_loc` is well-formed (`start.offset ≤ end.offset`, both in `[0,
  len]`) and that tagged-leaf slices round-trip to their values.

## Docs obligations

- Update the `parse` and `compile` docblocks (they show literal output shapes —
  `jssm_compiler.ts:126-137`, `:323-334`) to document the `{ locations: true }`
  option and the `loc` field, noting the default output is unchanged.
- DocBlock the new `FslSourceLocation` type and the `JssmError.source_location`
  field.
- Update the README public-API section (or its generating source — README is
  generated via `npm run build`) for the new parse option.
- Regenerate tracked artifacts with `npm run build` (not `npm run make`) before
  any merge/release.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Adding `loc` silently changes default `parse()` output and breaks the equality tests | Strict opt-in gate; an explicit test asserts no `loc` keys appear without the flag. |
| `location()` slows the hot parse path (benchmark-gated repo; prior `--cache` revert #682/#683) | Locations only computed under the flag, which the library path never sets. Optionally benchmark the flag-on path; it is editor-only (human typing speed), not the construction hot loop. |
| Boxing temptation creeps back in | Explicitly rejected as Approach B in Non-goals; primitives stay bare. |
| Sub-span wrappers change inner value shape and leak into `compile()` | Wrappers are `options.locations`-gated and unwrapped within the same rule; the value handed onward is identical to today when the flag is off, and the bare primitive when on. |
| "Second occurrence" location needs node identity the accumulator drops | Contained refactor of the `results` aggregation to retain located nodes for one-only/duplicate checks; covered by the compiler-error-location tests. |
| Sketch is not production code; over-investing | Only a pure `diagnosticsFor` helper is extracted; the rest stays sketch. Promotion to `src/` is a separate plan. |
| Regenerated `fsl_parser.ts` diff is large/noisy | Expected — it's generated. Review the `.peg` diff; treat `fsl_parser.ts` as a build artifact. |

## Open questions

- **`compile` import specifier in the sketch.** Confirm whether the sketch
  imports `compile` from `../../dist/es6/jssm.js` (package root re-export) or a
  dedicated compiler entry; resolved during implementation against the actual
  `dist/es6` layout.
- **Sub-span for multi-value attributes** (e.g. `LabelList`-valued
  `start_states`). v1 tags the whole value's span; per-element spans are
  deferred unless a diagnostic needs them.
- **Version bump / release.** Per project policy every merged PR triggers an npm
  release; the version bump happens via `/sc-commit` on this branch at
  implementation time, not now.

## References

- Editor / visualizer widget packaging design —
  `notes/superpowers/specs/2026-05-12-editor-widget-packaging-design.md`
- CM6 editor handoff —
  `notes/superpowers/cm6-editor-handoff.md`
- Editor feature inventory —
  `notes/editor_todos.json`
- Grammar — `src/ts/fsl_parser.peg`
- Compiler — `src/ts/jssm_compiler.ts`
- Error type — `src/ts/jssm_error.ts`
- Sketch linter — `sketch/cm6-editor/editor.js`
- Sketch language package — `sketch/cm6-lang-fsl/index.js`
