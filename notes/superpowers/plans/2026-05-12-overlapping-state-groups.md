# Overlapping State Groups — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Revision — 2026-06-08:** This plan was substantially reworked in a design session. Changes from the original 2026-05-12 version: group membership is now **ordered**, not a `Set`; nested groups are **not flattened** — the compiler keeps a group→group graph and resolves membership transitively (lazily), enabling depth-based precedence and nested rendering; member lists distinguish **nest** (`&child`) from **spread** (`...&child`); applying metadata/hooks/transitions to a group is **deep by default** with **inner-group-wins** specificity; per-state config, per-kind defaults, group metadata, and `state: {}` are unified into **one specificity cascade** with `default_state_config` as the implicit root group ⊤; the looping `()` group form is **dropped** (closed/ring topology is the cycles feature's job); and a parallel **`transition: {}`** default-edge-config (wiring the existing parser-only `ConfigTransition` rule) is added as the edge-side mirror of `state: {}`; and a new **`graph: {}`** block completes the Graphviz node/edge/graph default-attribute triad, **superseding** the scattered graph-level keys (`graph_layout`, `graph_bg_color`, `edge-color`, `dot_preamble`, `theme`, `flow`) as deprecated aliases. Locked decisions and tasks below reflect the reworked design.

**Goal:** Extend FSL's existing `NamedList` construct (`&group : [a b c];`) from a fan-out transition-target alias into a first-class, **ordered** *state group* with shared behaviour. Groups gain: transition sources, default state metadata, boundary hooks, and runtime membership queries. Groups overlap freely *and* nest freely — a state can belong to multiple groups, and a group can contain other groups — which is strictly more expressive than hierarchical states (it captures both overlap and depth) and unique in the state-machine library space.

**Architecture:** Extend the PEG grammar with one new atomic form (`GroupRef`), a nest/spread member syntax, and one new statement (`HookDeclaration`); extend `ArrowTarget` and `StateDeclaration` to accept group references; normalize and wire the existing parser-only `transition: {}` config. The compiler keeps an **ordered group→group graph** (no flattening), resolves membership transitively with a DAG (cycle) check, and expands group references into per-member transitions and metadata with **depth-specificity** conflict resolution. Runtime API additions on the `Machine` class cover deep membership queries and boundary-hook firing. A single config **cascade resolver** merges theme → `state: {}` (root group ⊤) → static per-kind defaults → group metadata by nesting depth → per-state config, with `active_state` as a runtime overlay; the same machinery drives the new `transition: {}` edge defaults. Visualization renders the group graph as nested Graphviz cluster subgraphs (nesting tree) with a chip fallback for non-tree overlap.

**Tech Stack:** TypeScript 4.7, Jest 29 (with @swc/jest), Rollup 4, PEG.js, existing jssm infrastructure.

**Reference design:** `src/doc_md/todo.md` — "Overlapping state groups" entry under Core machine features → Architectural. Subsumes Hierarchical states and State subtypes entries in the same subsection.

---

## Conventions used in this plan

- All file paths are relative to the repo root unless absolute.
- Test runs: `npx jest <file> -c jest-spec.config.cjs --color --verbose`. Full spec suite: `npm run jest-spec`.
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `test:`, `build:`).
- The package version is **NOT** bumped in this plan. Per `CLAUDE.md`, version bumps happen via `/sc-commit` and require explicit user authorization. The plan ends at "ready to ship as a major-version bump."
- All TDD-style tasks: write failing test → confirm it fails → write minimal code → confirm it passes → commit.
- This is a **major-version** change. Plan accepts breaking the grammar's external behavior; downstream FSL strings that happen to use a leading `&` in transition sources without a declared NamedList will now error rather than silently behave as labels.

---

## Locked design decisions

(Settled during the 2026-06-08 design session; not up for re-litigation during execution.)

1. **Syntax:** extend existing `NamedList` semantics. Keep `:` as the separator (`&busy : [loading saving];`). Do not introduce `&group = [...]` syntax. *(The `=` spelling from tracker #244 was considered and rejected in favour of grammar reuse.)*
2. **Reference syntax:** require `&` at every reference site so group names are unambiguous with state names (`&busy 'CANCEL' -> idle`).
3. **Ordered membership:** a group's members are an **ordered list**, not a set. Order is meaningful (declaration / precedence / iteration); the registry is `Map<group, MemberRef[]>`, never `Set`.
4. **No flattening — keep the group graph.** A member may be a state or another group. The compiler stores the direct, ordered members and resolves transitive membership **lazily**, preserving the group→group structure (needed for depth precedence and nested rendering). A **DAG/cycle check** rejects `&a:[&b]; &b:[&a];` at compile time.
5. **Nest vs spread member operators.** `&child` inside a member list **nests** child as a distinguishable sub-group (default; structure-preserving). `...&child` **spreads** child's members in flat, erasing the sub-group identity. Both yield the same transitive members; only nest preserves the relationship for precedence and nested viz.
6. **Deep apply with depth-specificity.** Applying a transition / metadata / hook to a group applies to **all transitive members** (deep by default). When definitions collide for a state, the **most-specific (deepest / nearest) group wins**; equal-depth ties fall back to declaration order; a state-specific definition always beats any group. Compile-time warning on group-vs-group overrides.
7. **Boundary semantics.** enter/exit hooks fire when a transition crosses the group's **transitive** boundary (prev not in, next in = enter; prev in, next not in = exit). Transitions wholly within the group do not fire its boundary hooks. The cascade fires per crossed level (inner and outer boundaries both fire when both are crossed).
8. **Unified config cascade.** State styling resolves through **one** least→most-specific cascade: theme → `state: {}` (`default_state_config`, treated as the **root group ⊤** containing every state) → static per-kind defaults (`start_state`/`end_state`/`terminal_state`/`hooked_state`) → group metadata ordered by **nesting depth** (outer→inner, inner wins) → per-state `state foo: {}`. `active_state` is a **runtime overlay** applied on top of the static cascade for the currently-occupied state, not a static tier. Cross-layer merge is silent override (later wins) and must **not** reuse the single-declaration redefine-throw (see Task 3 Step 5).
9. **No `()` looping group.** Closed/ring topology is owned by the cycles feature (`[a b c] -> +1`); groups are membership only. (A future `&group -> +1` to generate a ring over a named group is noted as adjacent, out of scope here.)
10. **`transition: {}` edge defaults.** Add an edge-side mirror of `state: {}` by **wiring the existing parser-only `ConfigTransition` rule** (normalizing its orphan `{config_kind,config_items}` shape to the standard `key:'default_transition_config'`). It is the root ⊤ of an edge-config cascade analogous to the state cascade.
11. **`graph: {}` graph defaults (supersedes scattered keys).** Add a new `ConfigGraph` block as the Graphviz *graph*-scope mirror of `state:` (node) and `transition:` (edge), completing the triad. It **supersedes** the existing scattered graph-level keys — `graph_layout`, `graph_bg_color`, `edge-color`/`edge_color`, `dot_preamble`, `theme`, `flow` — which become **deprecated aliases** folded into `default_graph_config` (with `graph: {}` winning on conflict). Unlike `transition:`, `graph:` has a real cascade *via groups*: a group's Graphviz **cluster** is a subgraph, so graph attributes cascade `graph: {}` → group/cluster → nested cluster by nesting depth (inner wins) — shared with the group-rendering work in Task 4.
12. **History:** per-group history slots. States with multi-membership have independent history per group.

---

## File structure

**New files:**

- `src/ts/tests/grammar_overlapping_groups.spec.ts` — Grammar-level parse tests for the new forms (~15 cases). Runs in default Node env.
- `src/ts/tests/compile_overlapping_groups.spec.ts` — Compile-pass tests for group expansion, conflict resolution, and validation (~25 cases).
- `src/ts/tests/runtime_overlapping_groups.spec.ts` — Runtime API tests for `isIn`, `groupsOf`, `groups`, `statesIn`, and boundary-hook firing (~20 cases).
- `src/ts/tests/viz_overlapping_groups.spec.ts` — Visualization smoke tests for nested-cluster emission, chip fallback, and edge-default application (~6 cases).
- `src/ts/tests/cascade_state_config.spec.ts` — Tests for the unified theme→`state:`→kind→group→state cascade, depth-specificity ordering, the `active_state` runtime overlay, and silent cross-layer override (no redefine-throw) (~15 cases).
- `src/ts/tests/transition_config.spec.ts` — Tests that `transition: {}` parses to the normalized shape, compiles through `compile_rule_handler`, and applies as default edge styling (~8 cases).
- `src/fsl.tools/site/recipes/patterns-overlapping-groups.cjs` — Cookbook recipe demonstrating the HTTP-request example.
- `src/fsl.tools/site/recipes/patterns-user-account-groups.cjs` — Cookbook recipe demonstrating the user-account-states example with overlapping Active/Restricted memberships.

**Modified files:**

- `src/ts/fsl_parser.peg` — Grammar additions: `GroupRef`; nest (`&child`) / spread (`...&child`) member syntax inside label lists; `HookDeclaration`; `ArrowTarget` / `StateDeclaration` extensions; **normalize the existing `ConfigTransition` rule** from its orphan `{config_kind,config_items}` shape to `{ key:'default_transition_config', value }`; add a new **`ConfigGraph`** (`graph: {}`) block and re-route the deprecated graph-level keys (`graph_layout`, `graph_bg_color`, `edge-color`/`edge_color`, `dot_preamble`, `theme`, `flow`) as aliases into it.
- `src/ts/jssm_compiler.ts` — Compile-pass handlers for new rule variants; ordered group→group registry; transitive resolution + DAG/cycle check; depth-specificity conflict cascade; wire `default_transition_config` and `default_graph_config` through `compile_rule_handler`; fold the deprecated alias keys into `default_graph_config` (`graph: {}` wins on conflict).
- `src/ts/jssm_types.ts` — GroupRef-bearing parse-tree variants; `JssmGroupMemberRef` (state | nested group | spread group); ordered `JssmGroupRegistry = Map<string, JssmGroupMemberRef[]>`; `JssmHookDeclaration`; `JssmTransitionConfig` / `JssmGraphConfig` (edge / graph defaults) and `default_transition_config` / `default_graph_config` on `JssmGenericConfig`.
- `src/ts/jssm.ts` — New `Machine` methods (`isIn`, `groupsOf`, `groups`, `statesIn`, all deep/transitive); boundary-hook plumbing; the **unified config cascade resolver** (`resolve_state_config`) and a pure non-throwing `merge_state_config`; `active_state` runtime overlay; edge-config resolution for `transition: {}`.
- `src/ts/jssm_viz.ts` — `groups_to_subgraph_string` helper rendering the **nesting tree** as nested clusters; chip fallback for non-tree overlap; render-config flag; apply resolved edge defaults from `transition: {}`; apply `graph: {}` at graph scope and cascade it through group clusters (graph → cluster → nested cluster); integration with `machine_to_dot`.
- `notes/fsl-grammar-reference.md` — Document the new grammar additions and disambiguation rules.
- `src/fsl.tools/AGENTS.md` — If the cookbook recipe authoring patterns change (likely not, but check).
- `base_README.md` — Short "Overlapping state groups" section in the appropriate area, per CLAUDE.md project conventions.
- `src/doc_md/todo.md` — Mark "Overlapping state groups" `[done]`; retire "Hierarchical states" and "State subtypes" as subsumed; note `transition: {}` wiring closes the parser-only-`ConfigTransition` gap.

**Unchanged:**

- All theme code under `src/ts/themes/`.
- All other test files except the four new spec files.

---

## Task 1: Grammar extension

**Files:**
- Modify: `src/ts/fsl_parser.peg`
- Run: `npm run peg` to regenerate `src/ts/fsl_parser.ts`

- [ ] **Step 1: Add `GroupRef`, nest/spread member syntax, and normalize `ConfigTransition`**

  Add the group-reference atom:

  ```peg
  GroupRef
    = "&" name:Label { return { key: 'group_ref', name }; }
  ```

  Place it near the existing `Label` / `LabelList` / `LabelOrLabelList` rules.

  Extend the member-list grammar so a member may be a state, a **nested** group (`&child`), or a **spread** group (`...&child`). Members stay **ordered**:

  ```peg
  GroupMember
    = "..." "&" name:Label { return { kind: 'group', name, mode: 'spread' }; }
    /        "&" name:Label { return { kind: 'group', name, mode: 'nest'   }; }
    /        s:Label        { return { kind: 'state', name: s }; }

  // NamedList's value becomes an ordered list of GroupMember.
  // Bare `[a b c]` still parses (all members kind:'state'), so existing
  // fan-out targets and fixtures are unaffected.
  ```

  Normalize the **existing** parser-only `ConfigTransition` rule so it emits the standard dispatch shape instead of its orphan `{config_kind,config_items}` form:

  ```peg
  ConfigTransition
    = WS? "transition" WS? ":" WS? "{" WS? items:TransitionItems? WS? "};" WS? {
        return { key: "default_transition_config", value: items || [] };
      }
  ```

  (`ConfigAction` / `validation` share the same orphan shape; leave them as-is unless trivially in the way — out of scope here.)

  Add the new **`graph: {}`** block and route the deprecated graph-level keys into it:

  ```peg
  ConfigGraph
    = WS? "graph" WS? ":" WS? "{" WS? items:GraphItems? WS? "};" WS? {
        return { key: "default_graph_config", value: items || [] };
      }
  ```

  Keep the existing `graph_layout` / `graph_bg_color` / `edge-color` / `dot_preamble` / `theme` / `flow` rules parsing (back-compat) but treat them as **deprecated aliases**; the compile pass (Task 2) folds them into `default_graph_config` with `graph: {}` winning on conflict. `graph: {}` is graph-scope *styling*, distinct from `start_states` / `end_states` (structural config — those stay top-level).

- [ ] **Step 2: Extend `ArrowTarget` to accept `GroupRef`**

  Modify the existing `ArrowTarget` rule:

  ```peg
  ArrowTarget
    = Stripe
    / Cycle
    / LabelList
    / GroupRef    // new — before Label
    / Label
  ```

  Order matters: `GroupRef` must come before `Label` so `&foo` parses as a group reference, not as an atom starting with `&` (which the atom grammar would reject anyway, but PEG's first-match-wins matters here).

- [ ] **Step 3: Extend `StateDeclaration` subject to accept `GroupRef`**

  ```peg
  StateDeclaration
    = "state" WS subject:(GroupRef / Label) WS? ":" WS?
      "{" WS? items:StateDeclarationItem* "}" WS? ";"
    { return { key: 'state_decl', subject, items }; }
  ```

  The semantic-pass code (Task 2) handles the GroupRef case by expanding to per-member state declarations.

- [ ] **Step 4: Add `HookEvent` and `HookDeclaration` rules**

  ```peg
  HookEvent
    = "enter"
    / "exit"

  HookDeclaration
    = "on" WS event:HookEvent WS subject:(GroupRef / Label) WS
      "do" WS action:ActionLabel WS? ";"
    { return { key: 'hook_decl', event, subject, action }; }
  ```

  Place near `ArrangeDeclaration` and `NamedList` in the top-level statement area.

- [ ] **Step 5: Add `HookDeclaration` to the `Term` alternatives**

  Modify the existing `Term` rule to add `HookDeclaration` as the first alternative:

  ```peg
  Term
    = HookDeclaration    // new — must be first to disambiguate from Exp
    / Exp
    / StateDeclaration
    / ArrangeDeclaration
    / NamedList
    / MachineAttribute
    / MachineProperty
    / Config
  ```

  Ordering: `HookDeclaration` is tried before `Exp` because an atom named `on` could otherwise be the source of a transition; the required `WS HookEvent` after `on` makes the parse deterministic.

- [ ] **Step 6: Regenerate the parser**

  Run `npm run peg` to produce `src/ts/fsl_parser.ts`. Verify the generated file compiles by running `npm run typescript`.

- [ ] **Step 7: Write parse-only smoke tests**

  Create `src/ts/tests/grammar_overlapping_groups.spec.ts` with cases:

  1. `&busy : [loading saving];` parses as existing NamedList shape (no change).
  2. `&busy : [loading saving]; &busy 'CANCEL' -> idle;` parses with GroupRef in ArrowTarget position.
  3. `&busy : [loading saving]; state &busy : { color: amber; };` parses with GroupRef in StateDeclaration position.
  4. `&busy : [loading saving]; on enter &busy do 'log';` parses HookDeclaration.
  5. `&busy : [loading saving]; on exit &busy do 'cleanup';` parses HookDeclaration with `exit` event.
  6. `on enter foo do 'log';` parses HookDeclaration on a regular state (not a group).
  7. Negative: `&undeclared 'x' -> y;` — parses (resolution is Task 2), produces parse tree with GroupRef.
  8. Nest member: `&outer : [&inner x];` parses with ordered members `[{kind:'group',mode:'nest',name:'inner'},{kind:'state',name:'x'}]`.
  9. Spread member: `&outer : [...&inner x];` parses with `mode:'spread'` on the inner member.
  10. `transition : { color: red; };` parses to `{ key:'default_transition_config', value:[…] }` (normalized shape, not `config_kind`).
  11. Backwards compat: every test fixture under `src/ts/tests/fixtures/` that previously parsed still parses identically (bare `[a b c]` lists unchanged).

- [ ] **Step 8: Run the full existing test suite**

  Confirm `npm run jest-spec` passes unchanged (no behaviour changes yet — grammar is permissive).

---

## Task 2: AST handling and compile pass

**Files:**
- Modify: `src/ts/jssm_types.ts`
- Modify: `src/ts/jssm_compiler.ts`

- [ ] **Step 1: Extend type definitions in `jssm_types.ts`**

  Add types:

  ```typescript
  type JssmGroupRef = { key: 'group_ref'; name: string };

  // Ordered member of a group: a state, a nested sub-group, or a spread group.
  type JssmGroupMemberRef =
    | { kind: 'state'; name: string }
    | { kind: 'group'; name: string; mode: 'nest' | 'spread' };

  type JssmHookDeclaration = {
    key:     'hook_decl';
    event:   'enter' | 'exit';
    subject: JssmGroupRef | string;
    action:  string;  // action label
  };

  // ORDERED, graph-bearing — never a Set. Stores DIRECT members only;
  // transitive membership is resolved lazily (preserves the group graph).
  type JssmGroupRegistry = Map<string, JssmGroupMemberRef[]>;

  // Edge-side analogue of the state-config items; the value of `transition: {}`.
  type JssmTransitionConfig = JssmStateConfig;  // reuse the style shape for v1

  // Graph-scope defaults; the value of `graph: {}`. Covers the superseded
  // scattered keys (layout, bgcolor, default edge color, preamble, theme, flow).
  type JssmGraphConfig = JssmStateConfig & {
    layout?: string; bgColor?: string; dotPreamble?: string;
    theme?:  string; flow?: string;
  };

  // Extend any existing union types that cover ArrowTarget, StateDeclaration
  // subject, and Term so GroupRef / HookDeclaration are represented.
  ```

- [ ] **Step 2: Add `state_property` / `group_registry` to `JssmGenericConfig`**

  Extend `JssmGenericConfig<StateType, mDT>` with:

  ```typescript
  group_registry?:            JssmGroupRegistry;                       // ordered, graph-bearing
  group_metadata?:            Map<string, JssmStateConfig>;            // group → metadata defaults
  group_hooks?:               Map<string, { onEnter?: string; onExit?: string }>;
  default_transition_config?: JssmTransitionConfig;                    // the `transition: {}` block
  default_graph_config?:      JssmGraphConfig;                          // the `graph: {}` block (+ folded aliases)
  ```

- [ ] **Step 3: Add compile_rule_handler dispatch for new rule variants**

  In `jssm_compiler.ts`, add cases in `compile_rule_handler` for:

  - GroupRef appearing as a transition source (ArrowTarget in `from` position): expand to one transition per **transitive** group member, tagged with the source group + its depth for conflict resolution.
  - GroupRef appearing as a `StateDeclaration` subject: register as group metadata (resolved through the cascade at runtime, Task 3 Step 5) rather than eagerly fanned out, so depth-specificity is preserved.
  - HookDeclaration: register the hook in `group_hooks` (if subject is GroupRef) or in per-state hooks (if subject is a plain Label).
  - `default_transition_config` (the normalized `transition: {}`): condense its items (an edge-style analogue of `state_style_condense`) and store on `JssmGenericConfig.default_transition_config`. Add `default_transition_config` to the `key`-dispatch so it no longer falls through to the "Unknown rule" throw.
  - `default_graph_config` (the new `graph: {}`): condense and store on `JssmGenericConfig.default_graph_config`. **Fold the deprecated alias keys** (`graph_layout`, `graph_bg_color`, `graph_default_edge_color`, `dot_preamble`, `theme`, `flow`) into the same target — apply each alias first, then let `graph: {}` override on conflict — and emit a deprecation warning when an alias key is used.

- [ ] **Step 4: Build the ordered group graph + cycle check**

  Walk all `NamedList` parse-tree nodes, building `group_registry: Map<groupName, JssmGroupMemberRef[]>` preserving **declaration order** and recording each member as a `state`, a nested `group`, or a spread `group`. Do **not** flatten. Then run a **DAG/cycle check** over group→group edges (nest and spread both count as edges) and throw `JssmError` on a cycle (`&a:[&b]; &b:[&a];`). Provide a memoized `transitive_members(group)` resolver that walks the graph, splicing nested groups in at their ordered position and inlining spread groups' members; nest vs spread differ only in whether the sub-group identity is retained for precedence/viz, not in the resulting member set.

- [ ] **Step 5: Reference-resolution pass**

  After the first compile pass, walk every `group_ref` in the parse tree (in transition sources, state declarations, and hook subjects). For each:

  - If the referenced group name is not in `group_registry`, throw `JssmError` with a clear message pointing at the unresolved name.
  - Forward references are allowed (the walk happens after the full tree is collected).

- [ ] **Step 6: Conflict resolution for transitions**

  When multiple transitions match the same `(source, action)` pair after group expansion:

  - State-specific transitions (declared without any group) always win.
  - Among group-sourced transitions, the **most-specific (deepest / nearest) group wins** — compute each contributing group's nesting depth relative to the source state and pick the deepest. Equal-depth ties (a state reached through two unrelated groups at the same depth) fall back to **declaration order** (later wins).
  - When a group-vs-group override is applied, emit a compile-time warning naming the overridden and overriding groups and the winning depth.

- [ ] **Step 7: Write compile-pass tests**

  Create `src/ts/tests/compile_overlapping_groups.spec.ts` with cases:

  - Group transition expansion: `&busy : [a b]; &busy 'x' -> y;` produces two transitions equivalent to `a 'x' -> y; b 'x' -> y;`.
  - Group metadata expansion: `&busy : [a b]; state &busy : { color: red; };` produces per-state metadata.
  - Forward reference: `state &busy : { color: red; }; &busy : [a b];` (group declared after its use) resolves correctly.
  - Conflict (state-wins): `&busy : [a]; &busy 'x' -> b; a 'x' -> c;` — state-specific transition `a -> c` wins.
  - Conflict (most-recent group wins): `&g1 : [a]; &g2 : [a]; &g1 'x' -> b; &g2 'x' -> c;` — `c` wins; warning emitted.
  - Invalid reference: `&undeclared 'x' -> y;` throws JssmError with clear message.
  - Hook declaration registered: `&busy : [a]; on enter &busy do 'log';` registers a group hook.
  - Nest preserves structure: `&inner:[a b]; &outer:[&inner c];` — `transitive_members('outer')` = `[a,b,c]`, and the graph records the outer→inner edge.
  - Spread erases structure: `&inner:[a b]; &outer:[...&inner c];` — `transitive_members('outer')` = `[a,b,c]`, but no outer→inner sub-group edge remains for viz/precedence.
  - Cycle rejected: `&a:[&b]; &b:[&a];` throws JssmError.
  - Depth-specificity: state in `&inner ⊂ &outer`, both define action `x` — the inner transition wins.
  - `transition: { color: red; };` compiles to `default_transition_config` (no "Unknown rule" throw) and condenses to `{ color:'red' }`.

- [ ] **Step 8: Run the full test suite**

  Confirm `npm run jest-spec` passes (existing tests + new compile-pass tests).

---

## Task 3: Runtime API

**Files:**
- Modify: `src/ts/jssm.ts`

- [ ] **Step 1: Extend `Machine` constructor to accept group registry**

  Read `group_registry`, `group_metadata`, and `group_hooks` from the incoming `JssmGenericConfig` and store as private fields on the `Machine` instance.

- [ ] **Step 2: Build the inverse index**

  At construction time, precompute `state_to_groups: Map<stateName, Set<groupName>>` from the group registry. This makes `groupsOf(state)` an O(1) lookup.

- [ ] **Step 3: Implement membership query methods**

  Add to `Machine`:

  ```typescript
  /**
   *  Test whether the current state belongs to the named group.
   *  @param groupName The group to query.
   *  @returns true if the current state is a member of the group; false otherwise.
   *  @example
   *  const m = sm`&busy : [loading saving]; idle 'go' -> loading;`;
   *  m.go('go');
   *  m.isIn('busy');  // => true
   */
  isIn(groupName: string): boolean

  /**
   *  Return the set of groups the given state belongs to.
   *  @param state The state to query.
   *  @returns A Set of group names; empty if the state belongs to no groups.
   */
  groupsOf(state: StateType): Set<string>

  /**
   *  Return all declared group names in this machine, in declaration order.
   */
  groups(): string[]

  /**
   *  Return all state names that belong to the named group.
   *  @param groupName The group to query.
   *  @throws JssmError if the group is not declared.
   */
  statesIn(groupName: string): StateType[]
  ```

  Per CLAUDE.md conventions, include DocBlock for each method covering args, returns, success example, and failure mode where applicable.

- [ ] **Step 4: Boundary-hook plumbing**

  In the transition path (`_go` or equivalent — find the canonical entry point in `jssm.ts`), after the state change is determined but before/after it is committed:

  - Compute `prev_groups = state_to_groups.get(prev_state) ?? new Set()`.
  - Compute `next_groups = state_to_groups.get(next_state) ?? new Set()`.
  - For each group in `prev_groups \ next_groups` (set difference), invoke its `onExit` hook if one is registered.
  - For each group in `next_groups \ prev_groups`, invoke its `onEnter` hook if one is registered.
  - Transitions where `prev_state === next_state` do not fire any boundary hook (no boundary crossed).
  - Transitions wholly within a group (where the group is in both `prev_groups` and `next_groups`) do not fire that group's hooks.

- [ ] **Step 5: Unified config cascade (`resolve_state_config`)**

  Replace the ad-hoc style merge with **one** resolver that merges, least → most specific:

  1. Theme defaults (base, then active theme).
  2. **`state: {}`** (`default_state_config`) — treat as the metadata of the implicit **root group ⊤** containing every state.
  3. **Static** per-kind defaults — `start_state` / `end_state` / `terminal_state` / `hooked_state` — selected by the state's structural kind.
  4. **Group metadata, ordered by nesting depth** (outer → inner; inner wins; equal-depth ties by declaration order). This is where `state &busy : { color: amber; };` lands.
  5. Per-state `state foo : { … };` — most specific static tier.
  6. **`active_state` runtime overlay** — applied on top for the currently-occupied state only (dynamic, not a static tier).

  **Override-throw handling (required).** `state_style_condense` (`jssm.ts:181`) throws on redefining a key *within a single declaration block*. The cascade merges *across* tiers where later-wins is intentional, so it must **not** route through that guard. Add a pure `merge_state_config(base, over)` that does a shallow key-wise override (`over` wins; `undefined` keys ignored) and **never throws**; the redefine-throw stays scoped to condensing one block. `resolve_state_config` folds the tiers with `merge_state_config`.

  Memoize per-state static resolution (stable for the machine's lifetime); recompute only the `active_state` overlay on transition.

- [ ] **Step 6: Write runtime tests**

  Create `src/ts/tests/runtime_overlapping_groups.spec.ts` with cases:

  - `isIn` returns true/false correctly for current state.
  - `groupsOf` returns the right Set; empty for non-member states.
  - `groups()` returns the right list in declaration order.
  - `statesIn` returns members; throws on undeclared group.
  - Boundary `onEnter` fires when entering a state in a group from outside.
  - Boundary `onExit` fires when leaving a state in a group to a state outside.
  - Transition within a group does not fire boundary hooks for that group.
  - Multi-membership: state in groups A and B — entering it fires both A's and B's `onEnter`.
  - Group metadata applied: `state &busy : { color: amber; };` — `m.style_for(member).color === 'amber'`.
  - Cascade precedence: per-state config beats group; inner group beats outer; `state: {}` is the base; theme is below all.
  - Override does not throw: a key set at `state: {}` *and* overridden by `state foo: {}` resolves to foo's value without raising the single-block redefine error.
  - `active_state` overlay: the currently-occupied state picks up `active_state: {}` styling on top of its static resolution, and loses it after transitioning away.

- [ ] **Step 7: Run the full test suite**

---

## Task 4: Visualization

**Files:**
- Modify: `src/ts/jssm_viz.ts`

- [ ] **Step 1: Decide on overlapping-group rendering convention**

  Two candidate conventions; pick by visual inspection. The decision is gated on rendering one or two real examples (the cookbook recipes from Task 5) and choosing whichever reads better:

  - **Cluster subgraphs (non-overlapping default):** Standard Graphviz `subgraph cluster_<name> { ... }` per group. Works perfectly for non-overlapping groups. For overlapping groups, every state appears in the *primary* group (first-declared), and other group memberships are indicated via small chip annotations on the node.
  - **Tag chips (overlap-friendly):** Render every node with small colored chips below the node label, one per group membership. No cluster subgraphs at all. Cleaner for many-overlap cases; loses the visual containment.

  Decision is captured in this step as a `render_groups` config flag with values `'cluster' | 'chips' | 'off'`.

- [ ] **Step 2: Add `groups_to_subgraph_string` helper**

  Render the cluster-subgraph form when chosen:

  ```typescript
  function groups_to_subgraph_string(u_jssm, l_states, state_index, group_registry): string {
    // Emit `subgraph cluster_<group> { label="<group>"; n0; n1; n2; }`
    // for each non-overlapping group.
  }
  ```

- [ ] **Step 3: Add chip-rendering branch**

  Render the chip form when chosen — annotate each node's label with HTML-style chips for each group membership beyond the first.

- [ ] **Step 4: Integrate into `machine_to_dot` (groups + edge + graph defaults)**

  Call the appropriate group helper based on `render_groups` config (default `'cluster'`, rendering the **nesting tree** as nested clusters; `'chips'` for non-tree overlap). Resolve and apply **`transition: {}`** edge defaults: an edge's style cascades theme → `default_transition_config` (edge ⊤) → (future per-edge config, not in v1) — so `transition: { color: blue; };` styles every edge. Resolve and apply **`graph: {}`** graph defaults at graph scope (after folding the deprecated alias keys), and cascade them into clusters: each group cluster's graph attributes resolve `default_graph_config` → cluster (group) → nested cluster by depth (inner wins). So `graph: { bgColor: …; }` styles the diagram, and the cluster box of a group inherits graph scope then overrides per nesting level — the graph-side mirror of `state: {}`.

- [ ] **Step 5: Write viz smoke tests**

  Create `src/ts/tests/viz_overlapping_groups.spec.ts` with cases:

  - Non-overlapping groups: cluster subgraph emitted; node IDs appear inside the cluster.
  - Overlapping groups (chip mode): chips appear on the node labels.
  - `render_groups: 'off'`: no group rendering at all (parity with current behavior on machines that don't declare groups).

- [ ] **Step 6: Visual inspection**

  Render the cookbook examples (`patterns-overlapping-groups.cjs`, `patterns-user-account-groups.cjs`) via `npm run make_cookbook` and confirm the visual output is interpretable.

- [ ] **Step 7: Run the full test suite**

---

## Task 5: Documentation and cookbook recipes

**Files:**
- Modify: `notes/fsl-grammar-reference.md`
- Modify: `base_README.md`
- New: `src/fsl.tools/site/recipes/patterns-overlapping-groups.cjs`
- New: `src/fsl.tools/site/recipes/patterns-user-account-groups.cjs`

- [ ] **Step 1: Update the grammar reference**

  Add a new section to `notes/fsl-grammar-reference.md` titled "15. Overlapping state groups" covering:

  - The `GroupRef` rule and where it can appear.
  - The `HookDeclaration` rule.
  - Conflict-resolution rules at compile time.
  - Boundary-hook semantics at runtime.
  - The disambiguation between NamedList declarations and GroupRef references.

- [ ] **Step 2: Update `base_README.md`**

  Add a short subsection (~30 lines) showing one motivating example and pointing readers at the cookbook for more.

- [ ] **Step 3: Write the HTTP-request cookbook recipe**

  Create `src/fsl.tools/site/recipes/patterns-overlapping-groups.cjs` demonstrating the canonical HTTP-request example:

  ```js
  module.exports = {
    title:    'Overlapping State Groups (HTTP Request)',
    category: 'Patterns',
    tags:     ['groups', 'overlap', 'http', 'advanced'],
    problem:  'A state machine where states share multiple orthogonal concerns — like an HTTP request that\'s simultaneously "in progress" and "receiving headers," or simultaneously "before body" and "connecting." Hierarchical states force a single tree; overlapping groups let each concern be its own categorical axis.',
    blocks: [
      { kind: 'fsl', title: 'connection.fsl', code: `
        &InProgress  : [Connecting Headers Body Trailers];
        &Receiving   : [Headers Body Trailers Done];
        &BeforeBody  : [Init Connecting Headers];

        Init        'open'    -> Connecting;
        Connecting  'ack'     -> Headers;
        Headers     'data'    -> Body;
        Body        'trailer' -> Trailers;
        Trailers    'fin'     -> Done;

        &InProgress 'timeout' -> Failed;
        state &Receiving : { color : blue; };
      `},
    ],
    note: '...',
  };
  ```

- [ ] **Step 4: Write the user-account-states cookbook recipe**

  Create `src/fsl.tools/site/recipes/patterns-user-account-groups.cjs` with the user-account example: states `LoggedIn`, `Suspended`, `Banned`, `Premium`, `Free`, with overlapping groups `&Active`, `&RestrictedAccess`, `&Paid`, `&Authenticated`. Demonstrates the categorical-labels-with-overlap use case where hierarchy doesn't fit.

- [ ] **Step 5: Run `npm run make_cookbook` and verify**

  Confirm the new recipes render and link from the cookbook index correctly.

- [ ] **Step 6: Update `src/doc_md/todo.md`**

  - Mark "Overlapping state groups" `[done]`.
  - Mark "Hierarchical states" and "State subtypes" `[done]` with notes pointing to the overlapping-groups feature.
  - Re-evaluate the "Architectural" tier intro paragraph — it now has fewer items, with the residual being "States as objects" and (already-demoted) "Multiple concurrent states."

---

## Task 6: Final pass

- [ ] **Step 1: Run the full test suite end-to-end**

  `npm run jest-spec` — 5,251+ tests pass, 100% coverage maintained.

- [ ] **Step 2: Run the full build**

  `npm run build` — vet, test, site, cookbook generation, doc generation, all succeed.

- [ ] **Step 3: Manual smoke-test of new functionality**

  In a REPL or scratch file:

  ```javascript
  const m = sm`
    &Active : [LoggedIn Premium];
    LoggedOut 'login' -> LoggedIn;
    LoggedIn  'upgrade' -> Premium;
  `;

  m.go('login');
  console.log(m.isIn('Active'));   // true
  console.log(m.groupsOf('Premium'));  // Set { 'Active' }
  ```

- [ ] **Step 4: Verify all retired TODO items are correctly retired**

  Audit `src/doc_md/todo.md` for any stale references to "hierarchical states" or "state subtypes" — those concepts should now point at overlapping groups everywhere they appear.

- [ ] **Step 5: Ready to ship**

  Plan stops here. A `/sc-commit` will be run separately and explicitly when the user wants to bump the major version and publish. Per CLAUDE.md, this plan does NOT bump the version itself.

---

## Open questions (decide during implementation)

1. **Non-tree overlap rendering** — the nesting tree renders as nested clusters; genuinely overlapping (non-tree) memberships still need the chip fallback. Confirm the chip visual by inspection in Task 4. *(Resolved in principle: nesting → nested clusters; overlap → chips.)*
2. **Should `HookDeclaration` also accept inline action bodies** (e.g. `on enter &busy do { log("entering"); }`) or only named action labels? Start with named labels; revisit if users request inline.
3. **Kind-vs-group cascade order** — locked as static-kind (tier 3) *below* group metadata (tier 4) *below* per-state (tier 5). Revisit only if a real case wants a group to lose to a kind default.
4. **History API shape** — `machine.lastInGroup('busy')`? `machine.history({ group: 'busy' })`? Defer; not required for v1.
5. **Compile-time-warnings format** — silent, console, or via a returned `warnings: string[]` field on the machine? Default to console.warn for now; revisit if warnings become numerous.
6. **`transition: {}` depth** — v1 applies it machine-wide (edge ⊤) only. Per-group or per-edge edge config (mirroring the full state cascade) is deferred until per-edge properties (#445) exist.

*(Group-of-group membership — previously open — is now **decided**: groups nest, the compiler keeps the graph, resolution is transitive. See Locked decisions 4–6.)*

## Risks

- **Grammar ambiguity surprises.** PEG can have subtle precedence issues. Mitigated by running the full existing test suite after every grammar change in Task 1.
- **Conflict-resolution surprises.** State-specific-vs-group precedence is intuitive in isolation but compound cases (state in three groups with overlapping definitions) can surprise. Mitigated by explicit compile-time warnings and at least one cookbook recipe demonstrating the cascade.
- **Visualization design churn.** Task 4 is the most exploratory. Time-box to one week; ship the best result and iterate later if needed.
- **Breaking change scope.** This is a major-version-shaped change. Some existing FSL strings might break if they were (incorrectly) using `&label` in transition source positions and relying on the old "parse error" behavior. Mitigated by the type-system catching most cases and clear error messages on the others.

## Out of scope

- **Parallel regions** (XState-style simultaneous states across orthogonal axes). Covered by the separate FSMs-as-machine-data-members plan.
- **Inline anonymous groups** (`&[a b c] 'foo' -> bar`). Deliberate non-feature; require named declaration.
- **Negative group membership** (`&except [...]` or `&[* except X]`). Defer.
- **Looping `()` group syntax and `&group -> +1` named rings.** Closed/ring topology belongs to the cycles feature; a named-group ring generator is adjacent future work, not this plan.
- **Edge-kind default tiers** (`main_transition: {}`, `forced_transition: {}`) mirroring the existing node-kind tiers (`start_state` / `terminal_state` / …). Identified as the one genuine remaining symmetry gap — states have kind-defaults, edges don't — but deferred: the v1 edge cascade is just the `transition:` ⊤; kind tiers slot in when per-edge config (#445) lands.
- **Removal of the deprecated graph-alias keys.** This plan keeps `graph_layout` / `graph_bg_color` / `edge-color` / `dot_preamble` / `theme` / `flow` working as aliases (with a deprecation warning); actually removing them is a later breaking-change pass.
- **Cross-machine groups** (referencing groups in nested machine-typed properties). Defer; designed alongside FSMs-as-properties.
- **Group renaming / migration tooling** for users coming from `XState`'s hierarchical states. Not required for v1.

## Total effort estimate

| Task | Estimate |
|---|---|
| Task 1: Grammar (GroupRef, nest/spread, `transition:` normalize) | 1–2 days |
| Task 2: Compile pass (ordered graph, DAG check, depth-specificity, `transition:` wiring) | 3–5 days |
| Task 3: Runtime API + unified cascade + override-throw + edge defaults | 3–4 days |
| Task 4: Visualization (nested clusters + chips + edge defaults) | 3–5 days (highest variance) |
| Task 5: Docs and recipes | 1–2 days |
| Task 6: Final pass | Half a day |

**Total: ~12–19 working days** for a focused implementation. Slightly above the original estimate because keeping the group graph (vs flattening) adds the transitive resolver + DAG check, the unified cascade subsumes and replaces the old style merge, and `transition: {}` wiring is folded in. Still far short of an "architectural rewrite": the parse-tree shape is additive, the compiler reuses its existing pipeline, the Machine class gains additive methods plus one cascade resolver, and the viz pipeline gains sibling helpers rather than being rewritten.
