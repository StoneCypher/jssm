# Language Features from `StoneCypher/fsl` Issue Tracker

Compiled 2026-05-12 from `fsl-issues.json` (1,329 issues + 3 PRs; 739 currently open). All 739 open issues were read; this document extracts the ones that propose new FSL language features (grammar, runtime semantics, machine-level constructs). Tooling / build / publishing / SEO / tutorial issues are excluded.

The list is split into:

1. **§A. Language features requested in the issue tracker** — features sourced from open issues, grouped thematically with issue numbers.
2. **§B. Additional language features that came up in our recent design conversations** — not present in the issue tracker as separately filed items (or only adjacent to existing issues). Listed separately so it's clear which are user-sourced vs. my-suggested.

Issue numbers in `()` parentheses. Where multiple closely-related issues exist, they're listed together. Open-tracker URL pattern: `github.com/StoneCypher/fsl/issues/<number>`.

---

## §A. Language features requested in the issue tracker

### A.1 Hooks — the largest cluster

The single biggest category of language feature requests. Grammar-level hook keywords plus runtime semantics.

**Hook grammar keywords** (one issue per keyword — likely a single coherent feature in practice):
- `on_enter` (#623), `on_exit` (#624), `on_transition` (#625)
- `on_any_transition` (#628), `on_standard_transition` (#629), `on_main_transition` (#630), `on_forced_transition` (#631)
- `on_action` (#632), `on_node_action` (#633), `on_any_action` (#634)
- `on_reject` (#635), `on_error` (#636), `on_reset` (#637)
- `on_start` (#638), `on_terminate` (#639)
- `on_tape_input` (#640), `on_tape_output` (#641)
- `on_after` (#642)

**Post-hook variants** (post-execution mirror of the above):
- `post_rejection` (#907), `post_error` (#908), `post_reset` (#909)
- `post_start` (#910), `post_terminate` (#911)
- `post_tape_input` (#912), `post_tape_output` (#913)
- `post_after` (#914)

**Hook architecture / meta-features:**
- Hooks should be "open" or "closed" (#617)
- `hooks: open;` and `hooks: closed;` in compiler (#645)
- Hook notation overall (#622)
- Hook requirement (#620)
- Named hooks: how to actually do it (#648); short notation (#619)
- Inline anonymous bindings as hooks (#649)
- Initial hooks (#1178), Final hooks (#1179)
- Final post-hooks (#1180), Initial post-hooks (#1181)
- `hook_everything` (#1298), `hook_after` implies `hook_after_any` (#1299)
- One-time next-access hooks (#1272)
- Hooks should take a promise (#880)
- Machine concept of being "stopped" distinct of state, for hooks (#621)
- Explicit list of supported hooks for machine (#434)
- Novel hooks (umbrella, #735)
- Basic hooks in grammar (#1109)
- Basic hooks (#1105) and future hooks (#1106) umbrella issues

**Hook return types (complex return shapes):**
- Complex return type: state change (#933), follow-up state change (#934)
- Validate that data-changing supports false/undefined/null (#935)
- Tape input return (#936), tape output return (#937)
- Warning queue (#939), error queue (#940)
- Causing start (#941), reset (#942), terminate (#943)
- Umbrella: "Return from hooks is more complex than yes/no" (#928)

**Override hooks / events:**
- Override hook (#1220), Override event (#1221), Override umbrella (#1223)

**Hook-related API:**
- `set_hook` baseline API (#660)
- API Reject/Error/Reset/Start/Terminate/Tape Input/Tape Output/After hooks (#671–#678)
- Fluent hook API (#699) with eight per-hook items (#690–#697)
- API: check whether a given state is hooked (#1158)
- API: check whether a given transition is hooked (#1251)

### A.2 Probabilistic / stochastic transitions

- Probabilities, probabilistics, stochastics umbrella (#485)
- Weighted start states (#414)
- Random walks (#62)
- Remove single-action-per-origin limitation when probabilistics involved (#419)
- Loadable transition probability map (#1244)
- Mechanism for merging probability maps (#1245)
- Measure machine history to determine frequency of each exit (#1246)
- Measure machine history for reachability likelihood (#1247)
- Verify support for probability `0`, probability `false` (#1248)

### A.3 Group / subgraph / hierarchy / embedding

The conceptual ancestors of the overlapping-groups feature we just designed.

- Hierarchical state charts (#7)
- Named sequential groups (#70), should be subordinable (#244)
- Cycles (#400), Stripes (#401)
- Spread (#72), No-self spread (#142), State spread (#453)
- Apparently named lists parse — implement and test their use (#279)
- Explicit ability to mark a group as a subgraph (#118)
- Containing box and descriptive title (#243)
- A notation for breaking into a remote subgraph (#173)
- Embedding machines in other machines (#160)
- Embeddable machine fragments (#235)
- Templated inclusion (#489)
- Physical colocation of start, end nodes (#245)

### A.4 Transition / edge language features

- Edge attributes (#143)
- Transitions should have properties (#445)
- Property on transition should be able to target html-like or record port (#1164)
- Voluntary edge labels (#433)
- Edge labels separate from action names (#326)
- Multiple edges with same origin/destination under different actions (#325)
- Multiple actions to one state (#1234)
- Wildcard transitions (#1217)
- URL decoration for transitions (#421)
- Control hover label of transitions (#423)
- Control arrow ends of transitions (#424)
- Control ports of transitions (#425)
- Port hints for edges (#127)
- Vague memory edge attributes may be order-locked (#1253)
- Bug: Disallowing different actions on same state (#531)
- Disallow transitions attribute (#860)
- Method to check if available action/transition can be made (#1239)

### A.5 State language features

- `complete: boolean | undef` flag on state declarations (#1145)
- State field `kind` (#1257), operator `kind` (#1256)
- State spread (#453)
- State declarations should reject quoted names — or should they? (#379)
- State declarations for nodes that aren't in the graph DSL should be a bug (#1209)
- Make the end node notation more useful (#149)
- Lock inputs to first row (rank constraint) (#371)
- Lock outputs / terminals / complete / finalized to last row (#372)
- URL decoration for states (#420)
- Control hover label of states (#422)
- Set a hover label (#313)
- Expose SVG ID of nodes to user (#315)
- State labels should make it to error messages (#426)
- Should be able to disable state labels in render (#427)
- Default new shapes for nodes with hooks (#247)
- Visual improvements to states umbrella (#319)

### A.6 Machine-attribute language features

- Module attribute `allow_islands` (#138); islands compile-time detection (#402)
- Machine attribute for whether islands are allowed; default `allow_with_start` (#403)
- Module attribute `failed_outputs` (#378)
- Module attribute `npm_name` (#406)
- Machine attribute indicating minimum FSL language version (#410)
- Default size attribute (#859)
- Hooks open/closed machine attribute (#617, #645)
- Mechanism to control background color of graphs (#176)
- Transparent as a state background color (#312)
- Default border color on all nodes (#347)
- Default background color on all nodes (#348)
- Default text color on all nodes (#349)
- Add support for X11 colors (#344)
- Also do the assign-level properties (#346)

### A.7 Operators / structural keywords

- Operator `when` (#88)
- Operator `kind` (#1256)
- Short notation for arrange chains (#618)
- Short notation for hookability ("named hooks") (#619)
- Dense property notation (#1174)

### A.8 Properties

- Properties umbrella (#762)
- Variance rules for property defaults (#1218)
- Props must be able to express functions (#1026)
- Props should be serviceable by functions rather than flat data reads (#1027)
- Constructor configuration to choose throw vs return-undefined on missing property (#705)
- Machines should be able to disallow constructor-configuring read of undefined props (#706)
- No practical way to set `.data` to `undefined` (#1264)
- Should there be a no-op that allows data change? (#708)

### A.9 Tape input / output

- Tape Input (#450), Tape Output (#457)
- `on_tape_input` / `on_tape_output` grammar (#640, #641)
- `post_tape_input` / `post_tape_output` (#912, #913)
- API Tape Input/Output Hooks (#676, #677)
- Tape input/output fluent hooks (#696, #697)

### A.10 Factories

- Factories umbrella (#413)
- Factory instance name (#430)
- Factory machine name factory method (#431)
- Factory machine data factory method (#459)
- Can specify which start node to take from factory (#443)

### A.11 Serialization (`toFsl` / round-tripping)

This is what `toString`/`fromString` (the discussion we had earlier) maps to in the tracker:

- Need a `toString` / `fromString` (#282) — *direct match*
- `.to_string()` formatter (#493)
- `.to_string()` formatter support for data (#494)
- Custom `.to_string()` formatter (#495)
- Fluent anti-compiler (#500)
- New parser should be perfectly reversible (recreate whitespace + comments) (#134)
- Future serialize/deserialize umbrella (#1070)
- Serialize must handle tape input (#1007), tape output (#1008)
- Serialize must refuse to deserialize future versions (#1010)
- Serialize must provide a to-string headered notation (#1013)
- Serialize must parse a to-string headered notation (#1014)
- Serialize to-string headered notation must be compressed (#1015)
- Force flag to ignore jssm version in deserialization (#1017)
- Deserialization must re-verify machine version support (#1056)
- Serialize must refuse newer-FSL machines than the codebase offers (#1057)

### A.12 Errors / introspection

- Improved error object: target action at error time (#744)
- Improved error object: data at error time (#745)
- Improved error object: start/stop/halt state at error time (#747)
- Improved error object: input tape position (#748)
- Improved error object: complete output tape (#749)
- Improved error object: state stack trace (#750)
- Better error object umbrella (#752)
- History-attached stack traces (#1271)
- Improved labels in errors alongside node names (#404)
- Some classes of error aren't being reported in the editor (#455)

### A.13 Output formats (language-level export, not just viz)

- Ability to derive state tables as JSON (#512)
- Ability to derive state tables as HTML (#513)
- Code emission umbrella (#418)
- jssm and jssm-cli should produce TS definitions as strings (#509)
- Emit meaningful, usable SCXML (#456)
- Emit TypeScript (#472)
- Ability to compile an npm module (#407)
- Compile target umbrella (#530, #595)
- Transcompile to other state machines (#563, #564–#577)
- Transcompile to XState (#564), state.js (#565), javascript-state-machine (#566), jsclass (#567), state-machine-cat (#568), machina.js (#569), easy-sm (#570), robot (#571), @steelbreeze/state (#572), st8 (#573), switchhub (#574), stent (#576), little-state-machine (#577)
- Transcompiler `targets` directive (#1173)
- Transcompiler plugin can declare abilities (#1172)
- `circle` compiler target (#1270)

### A.14 Type-level / type-system language features

- Version 6: poly-type template (#1166)
- Version 6 — states should be integers under the hood (#1167) (performance/architecture, not grammar, but interacts with types)
- Define type for Object in `Parse/2` wrapper (#547)
- Resurrect TS patch (#1313)
- Type checking: strict never got set in tsconfig (#712)

### A.15 Probabilistic / stochastic infrastructure (machine-level, not just grammar)

- Stochastic primitives (#994)
- Available stochastic testing criteria (#497)
- Stochastic system compilability testing (#64), stochastic stress testing (#67)
- Much better stoch testing (#205)

### A.16 Reset / lifecycle

- `.reset` (#449)
- Resetting a machine should take same arguments as constructing a machine (#1243)
- In constructor, option to not start immediately (#693)
- Disable calling forced transitions from the outside (#953)

### A.17 Theme / styling (language-level, as opposed to runtime-only)

- Add Penumbra / Penumbra Dark theme (#1147)
- Add Monokai as a graph theme (#1149)
- Add flowchart, 1950s flowchart themes (#1150, #1151)
- Themes should cover edges (#1152), external labels (#1153), title (#1154), graph special features (#1155)
- Add a style layer on the machine (#1171)
- Mechanism to change theme despite source (#1175)
- Node-kind targets for theming (#113)
- Pre-existing color themes (#162)
- Transitions need line styles too (#606)
- HTML-like labels support (#264)
- FontAwesome as node symbols (#438)
- Edge color naming consistency (#358)

### A.18 Misc

- Operator `when` (#88) — value of repetition; appears in two clusters
- Define a loadable transition probability map (#1244) etc. (cross-listed under A.2)
- Variance rules for property defaults (#1218) (cross-listed under A.8)
- Property getters make FSMs/FBMs implementations of Strategy Pattern (#1052) — tutorial framing rather than feature, but valuable
- `_post_transition_hooks` aren't being honored in valid transition determination (#1321) — bug, but flags a semantic gap

---

## §B. Additional language features from our recent design conversations

These came up in the conversation but weren't present as separately-filed issues, or were only partially adjacent to existing issues. Listed separately so you can audit which features came from your user community vs. which came from this conversation.

### B.1 Overlapping state groups (the major architectural item)

Adjacent to #70 (Named sequential groups), #244 (sequential groups subordinable), #279 (named lists parse). Not the same concept though — overlapping groups generalizes beyond sequential groups by allowing any state to belong to multiple groups simultaneously. The full design now has its own plan at `notes/superpowers/plans/2026-05-12-overlapping-state-groups.md`. Strictly more expressive than hierarchical states (#7).

### B.2 FSMs as machine data members (composition)

Closely related to #160 (Embedding machines in other machines) and #235 (Embeddable machine fragments) — but the conversation-side framing was specifically machine-typed `property` fields and a `machine.fullState()` snapshot/restore API, which the issue-tracker items don't articulate at that level. Together with overlapping groups, this covers most of what XState's hierarchy + parallel-region story provides. The compile-time and runtime semantics in the conversation are concrete enough to spec out next.

### B.3 First-class guards in FSL syntax (`where` keyword, via sensors)

Adjacent to #88 (operator `when`) and the broader hook discussion, but the specific `where`-clause syntax with named-sensor reference (Tier 1 composition only: comma-AND plus `!`-negation) is a conversation artifact, not an issue. Already in `src/doc_md/todo.md` under Core machine features → Edges and tagging.

### B.4 Sensors (the substrate guards depend on)

The general concept — named, pure, side-effect-free boolean predicates registered via constructor or runtime API — is forthcoming and not in the issue tracker. The user has flagged it as "we'll get to in a minute" in conversation. Should be specified soon since the guards entry depends on it.

### B.5 Multi-machine input as universal contract (library-level)

Paired single/set functions (`render`/`renderSet`, `lint`/`lintSet`, etc.). Not really a *language* feature — it's a library API contract — but interacts with language-shaped concerns when multiple machines reference each other (groups across machines, etc.). Captured in the Tooling architecture entry under `src/doc_md/todo.md`.

### B.6 First-class display options on machines

- Render-only-last-segment display flag (`display_short_names`)
- Custom name-chain delimiter (`chain_delimiter`)

Both are about how state names with hierarchical-style naming (`active.paused`) display in renderings. Not in the issue tracker; came up during the i18n discussion. Already in `src/doc_md/todo.md` under Display and rendering options.

### B.7 Image backgrounds for nodes / groups / graphs

The Graphviz / viz.js capability discussion: native node support already used; cluster (group) and graph backgrounds require SVG post-processing. Not specifically in the issue tracker as a feature request, but adjacent to:
- #176 (background color of graphs)
- #347, #348, #349 (default colors on nodes)
- #438 (FontAwesome as node symbols)

The post-processing infrastructure (the broader item) is a conversation artifact, captured in `src/doc_md/todo.md`.

### B.8 SVG post-processor pipeline

The architectural pattern for layering visualization enhancements: image backgrounds, accessibility annotations, OG-card framing, watermarks, theming. Not in the issue tracker; captured under Display and rendering options in the TODO.

### B.9 Reverse compilation / `toFsl(machine)` API

This *is* effectively #282 (toString/fromString) and #493–#495 (`.to_string()` formatter) from the tracker. Calling it out separately because the conversation framing — specifically as part of the unified-CLI `render --target=fsl` codegen target with round-trip-exact vs. readable modes — is more concrete than the tracker's older sketch. Currently captured in `src/doc_md/todo.md` under Code-generation targets.

---

## Cross-reference notes

- **Strongest overlap between A and B:** A.11 (serialization) and B.9 (`toFsl`) describe substantially the same feature with different framings.
- **A.1 (hooks) is so large** it should probably get its own dedicated planning document, parallel to the overlapping-groups plan. Currently the TODO has a guards-via-sensors entry but no comprehensive hooks plan.
- **A.13 (output formats / codegen)** is well-covered by the existing "Code-generation targets" subsection of the TODO; some specific transcompile targets in the tracker (#564–#577) could be added as concrete sub-items.
- **A.2 + A.15 (probabilistic/stochastic)** is the biggest category currently *not* well-represented in the TODO. Probabilistic transitions are mentioned (`5%` syntax already works) but the broader probability-map / measurement / random-walk infrastructure (#1244–#1248) isn't.

## Suggested triage shape

If you want to systematically work through this list, two reasonable starting points:

1. **By dependency chain.** Sensors first (B.4) — because guards (B.3) need it. Then hooks (A.1) — because so much downstream depends on the hook architecture. Then overlapping groups (B.1) and FSMs-as-properties (B.2) for the architectural shape. Then everything else in priority order.

2. **By scope.** Knock out short items first — `complete` flag (#1145), `kind` field (#1257), state-rank locks (#371, #372), edge attributes (#143), wildcard transitions (#1217) — each is ~1-day work and clears the issue count noticeably. Save the architectural items for focused sprints.

Both approaches are defensible. The first optimizes for compounding leverage; the second optimizes for visible issue-list shrinkage.
