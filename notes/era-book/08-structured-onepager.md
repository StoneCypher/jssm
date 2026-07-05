# v8 — The Structured Machine (one page)

**Mission:** machines carry shape. All structured data plus the group/graph system, and the
dragons-egg backfill is CLOSED before this era ends (John's v6-end gate lands by here at the
latest per the decided trio — see era-0 WP-6).

**Contents (~70):** containers (tuple, array+bounds, set `#[]`, bag `#()` for the future
petri rung, map `#{}` num/str keys, record) with the HOF protocol (bracket-throws/get-option,
map/filter/foldl/foldr/all/any/find/count/sort/flat_map, no foreach); ADTs + payload
matching, recursive⇒rich gate; option/`any`-narrow-only/aliases/`T?`; **streams** (§4.6:
seeded construction, journaled draws, snapshot state — demo issue fsl#1400 technobabble
generator); function-typed props (State pattern) and vals (strategy) with the
defunctionalization tag normalization specced (irreversibles #12); **§19 groups whole**:
`&group:[...]`, overlap+nest DAG, spread vs nest, boundary hooks, membership queries, group
config blocks, the unified cascade + `transition:{}`/`graph:{}`, per-group history,
repeat-state merge (#454 semantics); graph features: wildcards + resolution order,
eventless/else, `arranged` sugar, multigraph action rule; state-kinds lands here or v9 once
its #909 spec exists.

**Exit:** full type system checkable-tier complete; groups shipping with cascade; every
container/ADT/stream feature vectored; dragons-egg table fully green.

**Hazards:** the bag type must keep its no-zero-test discipline from birth (the petri
decidability line, even though the rung itself is v12); function-typed vals widen state
space — document the cost, don't hide it.

**Milestone:** fsl #51. **Sources:** era-1 WP-1.7 slices 4+ and WP-1.9; W6.13–.31, .43,
.80–.92.
