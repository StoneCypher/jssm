# todo

Complexity tags: `[trivial]` (under a day), `[straightforward]` (1–3 days,
well-bounded), `[medium]` (multi-day, design choices needed), `[hard]`
(substantial design + implementation), `[architectural]` (months, breaking
changes), `[done]`.

## Test data

- [ ] Have Claude generate language test data for the languages currently
      missing from `src/ts/tests/language_data/` — the README claims
      coverage of Italian and Punjabi but no test data exists for them.
      Existing files (`english.json`, `german.json`, `french.json`,
      `spanish.json`, `hebrew.json`, `russian.json`, `ukrainian.json`,
      `belarussian.json`, `bengali.json`, `portuguese.json`, `emoji.json`)
      define the expected schema.

## Language tooling

The full toolchain for treating FSL as a first-class language. Worked one
at a time.

### Committed

- [ ] **Machine CLI** `[medium]` — run/inspect machines from the shell;
      load `.fsl` files, step through transitions interactively, dump
      current state and available transitions, support non-interactive
      scripted runs from a stdin event stream.
- [ ] **Visualization CLI** `[straightforward]` — render machines to
      image/SVG; reuse the embedded `/viz` subpath that was just folded in.
      Should also offer format converters for Mermaid, PlantUML, DOT,
      and SCXML export.
- [ ] **Formatter** `[straightforward]` — auto-fix style; canonical
      whitespace/ordering/alignment, `--check` mode for CI, stdin/stdout
      for editor integration. Ships paired with the linter.
- [ ] **Linter** `[medium]` — surfaces style and simple-correctness
      issues; rule plugin/extension hook; shared config file format.
- [ ] **Static analyzer** `[medium]` — reachability of every declared
      state, dead/orphan state detection, hook signature validation
      against machine data.
- [ ] **TextMate grammar** `[straightforward]` — syntax highlighting on
      GitHub, VS Code, and most editors. Publish as a VS Code extension
      and submit to github-linguist for native GitHub highlighting.
- [ ] **MCP server** `[medium]` — expose machines and tooling to AI
      agents.
- [ ] **LSP server** `[hard]` — editor integration; depends on linter,
      analyzer, and formatter being usable as libraries first.

### Proposed — high value, modest scope

- [ ] **Tree-sitter grammar** `[medium]` — incremental parsing for
      Neovim, Helix, and GitHub code search.
- [ ] **Test framework for machines** `[medium]` — assertions over
      reachability, transition coverage, hook behaviour, property-based
      input sequences. Likely the most distinctive piece of FSL tooling.
- [ ] **Doc generator** `[medium]` — extract machine definitions, render
      a navigable site (states, transitions, invariants, hooks).
      "rustdoc for state machines."
- [ ] **Project scaffolder** `[straightforward]` — `jssm new <name>`
      bootstrap with tsconfig, tests, viz output.
- [ ] **Format-converter library** `[straightforward]` — round-trip
      between FSL and Mermaid/PlantUML/DOT/SCXML. Subsumes part of the
      visualization CLI.

### Proposed — high value, larger scope

- [ ] **Web playground** `[medium]` — paste FSL, see viz, drive
      transitions in-browser.
- [ ] **Debugger** `[hard]` — step through transitions, breakpoints on
      states/hooks, inspect data. Consider DAP (Debug Adapter Protocol)
      for editor reuse.
- [ ] **Model checker** `[hard]` — formal property verification
      (deadlock-free, liveness, etc.). Distinct from the static analyzer:
      looks at all reachable behaviour, not single-pass structural rules.
- [ ] **Coverage tool** `[straightforward]` — which states/transitions
      did the test suite exercise?
- [ ] **Standard library / pattern catalog** `[medium]` — reusable
      machines (timeout, retry, circuit breaker, auth flow, wizard,
      etc.). Lowers the "what do I write?" barrier for newcomers.

### Proposed — speculative or lower priority

- [ ] **Fuzzer** `[medium]` — random transition sequences to find
      unreachable-but-claimed states.
- [ ] **Profiler** `[straightforward]` — transition timing, hot states.
      Probably premature; JS profilers already work on machine code.
- [ ] **Code generators** `[hard]` — emit Python/Go/Rust state machines
      from FSL.
- [ ] **Semantic diff / bisect tool** `[medium]` — structural changes
      between two machine versions.

### Boring-but-essential infrastructure

- [~] **Language specification document** `[straightforward]` — human-
      readable grammar reference. The `.peg` file is the de facto spec
      but a written version helps adoption. **Partially done:**
      `notes/fsl-grammar-reference.md` is a complete feature-by-feature
      catalogue of the syntax (all 14 areas: lexical, numeric, colours,
      arrows, transitions, states, configs, attributes, properties,
      named lists, arrange, cheat sheet, quirks). Explicitly out of
      scope there: runtime semantics — what each construct *means* once
      parsed. A second "Runtime Semantics" companion is the missing half.
- [ ] **Style guide** `[straightforward]` — community naming/layout
      conventions.
- [ ] **Build-tool integrations** `[medium]` — Vite/Webpack/Rollup/
      esbuild plugins for importing `.fsl` files directly. Only if real
      demand surfaces.

## Core machine features

Items previously tracked in `notes/do want.md`. Several are good
candidates as quick credibility wins alongside the larger tooling work.

### Trivial / quick wins

- [ ] **`is_changing`** `[trivial]` — there's a commented-out reference
      at `jssm.ts:1281`. Add a private flag set during transition
      execution, expose as a getter. ~10–20 LoC plus tests.
- [x] **`initial_state` must be a valid state** `[done]` — already
      enforced at `jssm.ts:748`.

### Graph and analysis

- [ ] **Tolerate-islands check** `[straightforward]` — graph
      connectivity sanity check (warn or error if the machine has more
      than one weakly-connected component). Natural fit as a static-
      analyzer rule once that tool exists.
- [ ] **Compare two state machines** `[medium]` — depends entirely on
      what "compare" means. Structural diff is straightforward; semantic
      equivalence (do they accept the same inputs?) is a model-checking
      problem. Brainstorm scope before writing code.

### History and introspection

- [ ] **Rewind state history** `[straightforward]` — history exists as a
      circular buffer at `jssm.ts:377`; what's missing is a `.rewind()` /
      `.go_back(n)` method that replays state from history. ~30–50 LoC.
      Originally requested by `@kz`.
- [ ] **Transition probability long-term measurement** `[straightforward]`
      — counters on transition, expose as ratios. Behind a config flag.
- [ ] **State probability long-term measurement** `[straightforward]` —
      counters on state entry, expose as ratios. Pairs with above; ~100
      LoC for both.

### API ergonomics

- [ ] **Autocreate API from action names** `[straightforward]` — an
      action `melt` becomes a `.melt()` method on the instance. Runtime
      via `Object.defineProperty`; the type side needs mapped types over
      the action union. With optional prefixes as a config option.
- [ ] **Fluent API for creation** `[straightforward]` — builder-pattern
      wrapper over the existing config object. No semantic changes; pure
      ergonomics.
- [x] **DOT-like string API for creation** `[done]` — the FSL string
      syntax fills this role.

### Edges and tagging

- [ ] **Describe edges as members of groups** `[straightforward]` —
      small grammar addition for tags, plus query API. Grammar change is
      the longest part.

### Render targets

- [ ] **UML statechart representation** `[straightforward]` — render-
      format addition to the viz pipeline.
- [ ] **SDL representation** `[straightforward]` — render-format
      addition.
- [ ] **Drakon representation** `[medium]` — Drakon is unusual
      (vertical-flow visual language); rendering probably needs a custom
      layout engine, not graphviz. Sub-question: render from within
      gviz/viz.js or out-of-band?
- [ ] **Harel statechart representation** `[hard]` — depends on
      hierarchical states existing (see Architectural). Cannot do until
      that lands.

### Input formats

- [ ] **Consume `.dfa` files** `[medium]` — depends which DFA dialect
      (JFLAP, FAdo, Grail, custom). Once decided, parse-and-build.

### Async and control flow

- [ ] **Promise / async-await support** `[medium]` — these are the same
      mechanism. Real question: does an async transition block other
      transitions until resolved? What happens on rejection? Design
      first.
- [ ] **Generator support** `[hard]` — different control-flow model
      than promises; needs to define what a "generator-driven transition"
      means semantically.
- [ ] **Observable support** `[hard]` — implies a streaming model where
      machines react to event streams. Affects the public API
      significantly.

### Architectural — months, breaking changes

These four are one project, not four. Touches every file. The current
`string`-typed state is woven through types, parser, comparison, history,
and viz. Worth doing eventually for a "mature" FSL but should be a major
version with its own plan.

- [ ] **States as objects rather than strings** `[architectural]` —
      makes inheritance, hierarchy, and state-associated data (e.g.
      walking-state with frame#) easier; makes the underlying impl much
      harder. Per `@burny`'s original suggestion.
- [ ] **State subtypes** `[architectural]` — depends on states-as-
      objects.
- [ ] **Hierarchical states** `[architectural]` — triggered by
      subordinate on transfer callback to superior, or polling. Required
      for Harel rendering.
- [ ] **Multiple concurrent states** `[architectural]` — orthogonal
      regions, AND-states. The hardest of the four.

## Grammar bugs

Surfaced by `notes/fsl-grammar-reference.md` while cataloguing the
parser. Each is concrete and isolated.

- [ ] **`OctalDigit` accepts only `[0-1]`** `[trivial]` — should be
      `[0-7]`. Currently `0o17` is rejected even though `0o11` is
      accepted. One-character grammar fix plus a regression test.
- [ ] **`machine_reference` is parsed but unwired** `[trivial]` — the
      grammar defines a `machine_reference : <LabelOrLabelList>;` rule
      (line 1004) that constructs an AST node, but `MachineAttribute`
      (the alternation listing legal top-level keywords) does not
      include it, so writing `machine_reference: 'foo';` produces a
      parse error. Either wire it up or delete the orphan rule.
- [ ] **`Whitespace` named rule is dead code** `[trivial]` — defined
      at line 248 but has no callers; `WS` uses its own inline char
      class. Prune.
- [ ] **`SdStateLabel` mislabeled in error messages** `[trivial]` —
      line 1062 reads `SdStateLabel "color"` but the rule parses
      `label : <Label>;`. The `"color"` string is a copy-paste
      leftover from the adjacent `SdStateColor` rule; surfaces as
      misleading "Expected color…" parse errors when the parser
      wanted a `label:` assignment.

## Notes

- Difference between event and action: if an action isn't handled, it's
  an error; if an event, meh. (Carried forward from `notes/do want.md`
  for context — informs the test framework and language-spec items.)

## Ordering rationale

Rough credibility-per-effort ranking if starting over with no prior
commitments. Descriptive, not prescriptive — the Committed list above
reflects the actually-chosen order.

1. Formatter — regret-avoidance; wanted on every contribution
2. TextMate grammar — cheapest visibility multiplier in the toolchain
3. Machine CLI + Visualization CLI — usable end-to-end story
4. Linter + Static analyzer — quality floor
5. Doc generator + Web playground — ecosystem amplifiers
6. Test framework for machines — the differentiating capability
7. MCP and LSP last — both benefit from having the other tools to expose
