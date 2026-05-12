# Overlapping State Groups — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend FSL's existing `NamedList` construct (`&group : [a b c];`) from a fan-out transition-target alias into a first-class *state group* with shared behaviour. Groups gain: transition sources, default state metadata, boundary hooks, and runtime membership queries. Groups overlap freely — a state can belong to multiple groups — which is strictly more expressive than hierarchical states and unique in the state-machine library space.

**Architecture:** Extend the PEG grammar with one new atomic form (`GroupRef`) and one new statement (`HookDeclaration`); extend `ArrowTarget` and `StateDeclaration` to accept group references. Compile-pass expansion of group references into per-member transitions and per-member metadata, with conflict resolution at compile time. Runtime API additions on the `Machine` class for membership queries and boundary-hook firing. Visualization renders groups as Graphviz cluster subgraphs (non-overlapping case) or via a flagged convention TBD (overlapping case).

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

(From the TODO entry; not up for re-litigation during execution.)

1. **Syntax:** extend existing `NamedList` semantics. Keep `:` as the separator (`&busy : [loading saving];`). Do not introduce parallel `&group = [...]` syntax.
2. **Reference syntax:** require `&` at every reference site so group names are unambiguous with state names (`&busy 'CANCEL' -> idle`).
3. **Conflict resolution:** state-specific transitions always win; among groups, most-recently-declared wins. Compile-time warning emitted on overrides.
4. **Boundary semantics:** enter/exit hooks fire when a transition crosses the group boundary (prev not in, next in = enter; prev in, next not in = exit). Transitions wholly within the group do not fire boundary hooks.
5. **History:** per-group history slots. States with multi-membership have independent history per group.

---

## File structure

**New files:**

- `src/ts/tests/grammar_overlapping_groups.spec.ts` — Grammar-level parse tests for the new forms (~15 cases). Runs in default Node env.
- `src/ts/tests/compile_overlapping_groups.spec.ts` — Compile-pass tests for group expansion, conflict resolution, and validation (~25 cases).
- `src/ts/tests/runtime_overlapping_groups.spec.ts` — Runtime API tests for `isIn`, `groupsOf`, `groups`, `statesIn`, and boundary-hook firing (~20 cases).
- `src/ts/tests/viz_overlapping_groups.spec.ts` — Visualization smoke tests for cluster-subgraph emission and overlapping-group rendering (~5 cases).
- `src/fsl.tools/site/recipes/patterns-overlapping-groups.cjs` — Cookbook recipe demonstrating the HTTP-request example.
- `src/fsl.tools/site/recipes/patterns-user-account-groups.cjs` — Cookbook recipe demonstrating the user-account-states example with overlapping Active/Restricted memberships.

**Modified files:**

- `src/ts/fsl_parser.peg` — Grammar additions (one new rule, two extensions, one new top-level alternative).
- `src/ts/jssm_compiler.ts` — Compile-pass handlers for new rule variants; group registry; reference resolution; conflict cascade.
- `src/ts/jssm_types.ts` — New union variants for GroupRef-bearing parse tree nodes; new HookDeclaration shape; group registry type.
- `src/ts/jssm.ts` — New `Machine` methods (`isIn`, `groupsOf`, `groups`, `statesIn`); boundary-hook plumbing in the transition path.
- `src/ts/jssm_viz.ts` — `groups_to_subgraph_string` helper; render-config flag for groups; integration with `machine_to_dot`.
- `notes/fsl-grammar-reference.md` — Document the new grammar additions and disambiguation rules.
- `src/fsl.tools/AGENTS.md` — If the cookbook recipe authoring patterns change (likely not, but check).
- `base_README.md` — Short "Overlapping state groups" section in the appropriate area, per CLAUDE.md project conventions.
- `src/doc_md/todo.md` — Mark "Overlapping state groups" `[done]`; retire "Hierarchical states" and "State subtypes" as subsumed.

**Unchanged:**

- All theme code under `src/ts/themes/`.
- All other test files except the four new spec files.

---

## Task 1: Grammar extension

**Files:**
- Modify: `src/ts/fsl_parser.peg`
- Run: `npm run peg` to regenerate `src/ts/fsl_parser.ts`

- [ ] **Step 1: Add the `GroupRef` rule**

  Add the rule:

  ```peg
  GroupRef
    = "&" name:Label { return { key: 'group_ref', name }; }
  ```

  Place it near the existing `Label` / `LabelList` / `LabelOrLabelList` rules in the lexical-layer area of the grammar.

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
  8. Backwards compat: every test fixture under `src/ts/tests/fixtures/` that previously parsed still parses identically.

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

  type JssmHookDeclaration = {
    key:     'hook_decl';
    event:   'enter' | 'exit';
    subject: JssmGroupRef | string;
    action:  string;  // action label
  };

  type JssmGroupRegistry = Map<string, Set<string>>;

  // Extend any existing union types that cover ArrowTarget, StateDeclaration
  // subject, and Term so GroupRef / HookDeclaration are represented.
  ```

- [ ] **Step 2: Add `state_property` / `group_registry` to `JssmGenericConfig`**

  Extend `JssmGenericConfig<StateType, mDT>` with:

  ```typescript
  group_registry?:  JssmGroupRegistry;
  group_metadata?:  Map<string, JssmStateConfig>;   // group → metadata defaults
  group_hooks?:     Map<string, { onEnter?: string; onExit?: string }>;
  ```

- [ ] **Step 3: Add compile_rule_handler dispatch for new rule variants**

  In `jssm_compiler.ts`, add cases in `compile_rule_handler` for:

  - GroupRef appearing as a transition source (ArrowTarget in `from` position): expand to one transition per group member, marked with the source group name for conflict resolution.
  - GroupRef appearing as a `StateDeclaration` subject: expand to one StateDeclarationItem-set per group member, applied to the existing state-declaration pipeline.
  - HookDeclaration: register the hook in `group_hooks` (if subject is GroupRef) or in per-state hooks (if subject is a plain Label).

- [ ] **Step 4: Build the group registry during compile**

  Walk all `NamedList` parse-tree nodes, building `group_registry: Map<groupName, Set<memberName>>`. Members may be states or other groups (the registry stores the flat membership; group-of-group is left to a future pass if ever wanted).

- [ ] **Step 5: Reference-resolution pass**

  After the first compile pass, walk every `group_ref` in the parse tree (in transition sources, state declarations, and hook subjects). For each:

  - If the referenced group name is not in `group_registry`, throw `JssmError` with a clear message pointing at the unresolved name.
  - Forward references are allowed (the walk happens after the full tree is collected).

- [ ] **Step 6: Conflict resolution for transitions**

  When multiple transitions match the same `(source, action)` pair after group expansion:

  - State-specific transitions (those declared without going through any group) take priority. They override any group-sourced transition.
  - Among group-sourced transitions for the same `(source, action)`, the most-recently-declared group wins.
  - When an override is applied, emit a compile-time warning naming the overridden and overriding groups.

- [ ] **Step 7: Write compile-pass tests**

  Create `src/ts/tests/compile_overlapping_groups.spec.ts` with cases:

  - Group transition expansion: `&busy : [a b]; &busy 'x' -> y;` produces two transitions equivalent to `a 'x' -> y; b 'x' -> y;`.
  - Group metadata expansion: `&busy : [a b]; state &busy : { color: red; };` produces per-state metadata.
  - Forward reference: `state &busy : { color: red; }; &busy : [a b];` (group declared after its use) resolves correctly.
  - Conflict (state-wins): `&busy : [a]; &busy 'x' -> b; a 'x' -> c;` — state-specific transition `a -> c` wins.
  - Conflict (most-recent group wins): `&g1 : [a]; &g2 : [a]; &g1 'x' -> b; &g2 'x' -> c;` — `c` wins; warning emitted.
  - Invalid reference: `&undeclared 'x' -> y;` throws JssmError with clear message.
  - Hook declaration registered: `&busy : [a]; on enter &busy do 'log';` registers a group hook.

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

- [ ] **Step 5: Apply group metadata in `style_for`**

  Update `Machine.style_for(state)` to consider group-level metadata. Order of merge:

  1. Base theme defaults.
  2. Active theme(s).
  3. Group metadata (for each group the state belongs to, in declaration order — later wins).
  4. State-specific metadata.
  5. State-kind-specific metadata (terminal, start, end, active).

  This makes `state &busy : { color: amber; };` actually affect rendering through the existing viz pipeline.

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

- [ ] **Step 4: Integrate into `machine_to_dot`**

  Call the appropriate helper based on `render_groups` config. Default to `'cluster'`. The chips form is available via configuration.

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

1. **Visualization for overlapping groups** — cluster subgraphs with chip annotations vs. pure chip approach. Defer to Task 4 visual inspection.
2. **Should `HookDeclaration` also accept inline action bodies** (e.g. `on enter &busy do { log("entering"); }`) or only named action labels? Start with named labels; revisit if users request inline.
3. **Group-of-group membership** — should a group be able to contain another group? Defer; flat membership is sufficient for v1.
4. **History API shape** — `machine.lastInGroup('busy')`? `machine.history({ group: 'busy' })`? Defer; not required for v1.
5. **Compile-time-warnings format** — silent, console, or via a returned `warnings: string[]` field on the machine? Default to console.warn for now; revisit if warnings become numerous.

## Risks

- **Grammar ambiguity surprises.** PEG can have subtle precedence issues. Mitigated by running the full existing test suite after every grammar change in Task 1.
- **Conflict-resolution surprises.** State-specific-vs-group precedence is intuitive in isolation but compound cases (state in three groups with overlapping definitions) can surprise. Mitigated by explicit compile-time warnings and at least one cookbook recipe demonstrating the cascade.
- **Visualization design churn.** Task 4 is the most exploratory. Time-box to one week; ship the best result and iterate later if needed.
- **Breaking change scope.** This is a major-version-shaped change. Some existing FSL strings might break if they were (incorrectly) using `&label` in transition source positions and relying on the old "parse error" behavior. Mitigated by the type-system catching most cases and clear error messages on the others.

## Out of scope

- **Parallel regions** (XState-style simultaneous states across orthogonal axes). Covered by the separate FSMs-as-machine-data-members plan.
- **Inline anonymous groups** (`&[a b c] 'foo' -> bar`). Deliberate non-feature; require named declaration.
- **Negative group membership** (`&except [...]` or `&[* except X]`). Defer.
- **Cross-machine groups** (referencing groups in nested machine-typed properties). Defer; designed alongside FSMs-as-properties.
- **Group renaming / migration tooling** for users coming from `XState`'s hierarchical states. Not required for v1.

## Total effort estimate

| Task | Estimate |
|---|---|
| Task 1: Grammar | 1–2 days |
| Task 2: Compile pass | 2–4 days |
| Task 3: Runtime API | 2–3 days |
| Task 4: Visualization | 3–5 days (highest variance) |
| Task 5: Docs and recipes | 1–2 days |
| Task 6: Final pass | Half a day |

**Total: ~10–17 working days** for a focused implementation. Smaller than the original "architectural rewrite" framing because most of the work reuses existing machinery — the parse tree shape doesn't change, the compiler pipeline takes the same overall shape, the runtime Machine class gets additive methods rather than restructured internals, and the viz pipeline gains a sibling helper rather than being rewritten.
