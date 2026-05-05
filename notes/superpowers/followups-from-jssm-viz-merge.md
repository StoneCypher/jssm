# Follow-ups from the jssm-viz merge

Issues identified during the fold-in of jssm-viz that were preserved as faithful ports rather than fixed. To address in separate work after 5.109.0 ships.

## Bug — `lookup_transition_for` can return undefined; dot edge rendering doesn't guard

**Where:** `src/ts/jssm_viz.ts` `states_to_edges_string`, around the `edge_tr.kind` / `edge_tr.forced_only` / `edge_tr.main_path` accesses.

**What:** `u_jssm.lookup_transition_for(s, ex)` is *typed* as returning `JssmTransition` but its body returns `undefined` when `get_transition_by_state_names` finds nothing. Three accesses on `edge_tr` happen with no null guard.

**When it would fire:** In practice, never — `ex` comes from `list_exits(s)`, so the transition always exists. But it's a contract-vs-impl gap that any future refactor of `list_exits` or `_edges` synchronization could trip.

**Fix:** Add `if (!edge_tr) return '';` after the strike-find guard. One line. Defensive, doesn't change current behavior.

**Same bug exists in original jssm-viz.** Not introduced by the merge.

## Bug — `labelInline` operates on `JssmTransitionList`, not `JssmTransition`; per-direction colored labels are silently dropped

**Where:** `src/ts/jssm_viz.ts` `states_to_edges_string`, the `labelInline` array construction.

**What:** The first elements of the `labelInline` rows are `edge` and `pair`, both of which are `JssmTransitionList` objects (`{entrances, exits}`) returned by `list_transitions(...)`. The code reads `.probability`, `.action`, `.name` off them via `if_obj_field` — those fields don't exist on `JssmTransitionList`, so every read returns `''`. Net effect: `labelInline` always produces an empty string.

**User-visible impact:** Minor. The basic action/probability labels still render correctly via the separate `maybeLabel` / `maybeRLabel` path which correctly uses `edge_tr`/`pair_tr`. What's dropped is specifically the *colored HTML-styled* labels — the `<<font color="...">label</font>>` form that distinguishes `_1` and `_2` colors on bidirectional edges.

**Fix:** Replace `edge` and `pair` in the `labelInline` rows with `edge_tr` and `pair_tr`. Then the `if_obj_field` reads will hit real fields. Also: clean up the `edge` and `pair` truthiness guards (they're always truthy because they're object literals). The `if (pair) { strike.push(...) }` guard should be `if (pair_tr)` or `if (pair_id !== undefined)`.

**Same bug exists in original jssm-viz.** Not introduced by the merge.

**Why preserve as faithful port:** The design spec says `image_for_state` is the only deliberate behavioral change in the port. Re-enabling the colored per-direction labels would change all rendered output for bidirectional edges, which is a behavioral change worth deliberately scheduling rather than smuggling into the merge.
