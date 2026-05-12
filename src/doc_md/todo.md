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
- [ ] **Web Components renderer** `[medium]` — ship a custom element
      (e.g. `<jssm-machine>`) that takes an FSL string and renders a
      live, embeddable state-machine view, exposing transition
      controls and the current state. Distinct from the static
      diagram formats above and from `jssm/viz`'s SVG output: this is
      a drop-in interactive embed for docs sites, the fsl.tools
      homepage, tutorials, and blog posts. Design choices to settle
      first: API surface, styling extensibility (Shadow DOM vs. light
      DOM), whether the element owns its machine or proxies to one
      passed in.

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

- [x] **`OctalDigit` accepts only `[0-1]`** `[done]` — fixed; now
      `[0-7]`. Regression tests in
      `src/ts/tests/grammar_regressions.spec.ts` verify `0o27 === 23`
      and that `0o8`/`0o9` are still rejected.
- [x] **`machine_reference` is parsed but unwired** `[done]` — added
      to the `MachineAttribute` alternation. Surprise: the runtime was
      already fully wired (`jssm_compiler.ts:297, 385, 417, 481`), so
      only the grammar exposure was missing. Regression tests cover
      single-label, label-list, and quoted-string forms.
- [x] **`Whitespace` named rule is dead code** `[done]` — pruned.
      Regression test asserts the orphan rule cannot return.
- [x] **`SdStateLabel` mislabeled in error messages** `[done]` —
      display name corrected from `"color"` to `"label"`. Regression
      test asserts the correct `.peg` source label.

## fsl.tools site

- [ ] **Replace the bespoke renderer widget with the official one**
      `[straightforward]` — when the time comes. `src/fsl.tools/site/`
      currently ships a hand-rolled SVG graph renderer
      (`scripts/build.js#renderGraph` for the static cookbook,
      `components/CookbookGraph.jsx` for the homepage SPA) so the site
      can render graphs without dragging the full `jssm/viz` pipeline
      in at build time. Once `jssm/viz` is the right tool for both
      surfaces, swap the bespoke widget out so the cookbook and the
      rest of the ecosystem stay visually consistent.

## Shared content infrastructure

- [ ] **Centralize examples, demos, and shootouts for cross-site
      reuse** `[medium]` — example content currently scatters across
      `src/demo/` (main jssm site), `src/fsl.tools/site/recipes/`
      (cookbook), the language-shootout comparisons, and ad-hoc
      snippets in the README. Extract them into a single canonical
      source so the main jssm site, fsl.tools, and future per-
      language implementation sites (jssm-py, jssm-rs, jssm-go, etc.)
      can all consume the same content rather than each maintaining
      its own copy. Format must be language-agnostic enough that a
      non-JS site can render it — the existing recipe-file shape in
      `src/fsl.tools/site/recipes/` with a `language` (or target-
      implementation) tag axis added is the natural starting point.
      Open design questions: where lives canonical (a top-level
      `examples/` sibling to `src/`? a separate sibling repo so the
      Python and Rust ports can vendor it without pulling all of
      jssm?), how each site declares which examples it surfaces, and
      how translations of prose (problem statements, notes) are
      managed when the same example renders FSL → JS, FSL → Python,
      FSL → Rust.

## Project maintenance

- [ ] **Sweep the GitHub issue list** `[straightforward]` — triage the
      open issues at `github.com/StoneCypher/jssm/issues`: close stale
      ones, label and prioritize the rest, and roll anything still
      live into this TODO so it's not invisible.

## Marketing and SEO

- [ ] **Write a gitbook for SEO** `[medium]` — long-form hosted book
      covering state machines as a concept, FSL as the syntax, and
      jssm as the runtime. Targets search visibility for state-
      machine *learning* queries ("how do state machines work",
      "finite state machine tutorial", "when to use a state machine
      in JS", etc.) rather than jssm-specific queries — pulls in
      developers who don't yet know jssm exists. Distinct from the
      cookbook (recipes for existing users) and from the typedoc-
      generated reference docs (API surface): this is the
      "concept + tutorial + comparison" tier that the other two
      deliberately omit. Gitbook ranks unusually well on technical-
      tutorial queries, so the format itself is part of the SEO play,
      not just a content choice.

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
