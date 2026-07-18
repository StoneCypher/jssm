
import * as fc from 'fast-check';

import * as jssm from '../jssm';

import type { HookRegistryEntry, HookPhase } from '../jssm_types';

/** Code-unit string comparator, reproducing Array#sort's default ordering explicitly. */
const code_unit_compare = (a: string, b: string): number => (a < b ? -1 : (a > b ? 1 : 0));





// Stochastic coverage for the uniform observational-hook registry and its
// introspection accessors (`jssm.ts` — `hook_registry`, `hooks_on`,
// `has_hook`, `state_has_hooks`; megaspec §12, coverage drive fsl#651/#652).
//
// A machine plan is constructed from a random chain topology, a random
// subset of the 26 method-registered hook kinds (each aimed at a randomly
// chosen state / edge / action), and random FSL boundary-hook declarations
// (state- and group-subject, each direction independently present).  Every
// expectation below is derived from that construction recipe — the expected
// registry rows are computed from the plan, never read back from the
// machine — so the properties are real tests, not mirrors.



const RUNS = 50;



/** Selector context handed to each catalog entry: one concrete state, edge, and action drawn from the plan. */
type HookSelector = {
  s    : string,   // a state name
  from : string,   // edge origin
  to   : string,   // edge destination
  a    : string    // the action carried by that edge
};



/**
 *  One installable hook kind: how to register it on a live machine, and the
 *  registry row that registration must produce.  Keeping the row builder
 *  beside the installer means the expected registry is derived from the
 *  construction recipe alone.
 */
type CatalogEntry = {
  label   : string,
  install : (m: any, sel: HookSelector) => void,
  row     : (sel: HookSelector) => HookRegistryEntry
};



/** The full method-registered hook surface: 14 pre-phase and 12 post-phase kinds. */
const catalog: CatalogEntry[] = [

  // pre-phase, targeted
  { label: 'hook',                install: (m, x) => m.hook(x.from, x.to, () => true),                  row: x => ({ kind: 'hook',   phase: 'pre', target: { scope: 'edge', from: x.from, to: x.to } }) },
  { label: 'named',               install: (m, x) => m.hook_action(x.from, x.to, x.a, () => true),      row: x => ({ kind: 'named',  phase: 'pre', target: { scope: 'edge', from: x.from, to: x.to, action: x.a } }) },
  { label: 'entry',               install: (m, x) => m.hook_entry(x.s, () => true),                     row: x => ({ kind: 'entry',  phase: 'pre', target: { scope: 'state', state: x.s } }) },
  { label: 'exit',                install: (m, x) => m.hook_exit(x.s, () => true),                      row: x => ({ kind: 'exit',   phase: 'pre', target: { scope: 'state', state: x.s } }) },
  { label: 'after',               install: (m, x) => m.hook_after(x.s, () => true),                     row: x => ({ kind: 'after',  phase: 'pre', target: { scope: 'state', state: x.s } }) },
  { label: 'global action',       install: (m, x) => m.hook_global_action(x.a, () => true),             row: x => ({ kind: 'global action', phase: 'pre', target: { scope: 'action', action: x.a } }) },

  // pre-phase, global singletons
  { label: 'any action',          install: (m, _) => m.hook_any_action(() => true),                     row: _ => ({ kind: 'any action',          phase: 'pre', target: { scope: 'global' } }) },
  { label: 'standard transition', install: (m, _) => m.hook_standard_transition(() => true),            row: _ => ({ kind: 'standard transition', phase: 'pre', target: { scope: 'global' } }) },
  { label: 'main transition',     install: (m, _) => m.hook_main_transition(() => true),                row: _ => ({ kind: 'main transition',     phase: 'pre', target: { scope: 'global' } }) },
  { label: 'forced transition',   install: (m, _) => m.hook_forced_transition(() => true),              row: _ => ({ kind: 'forced transition',   phase: 'pre', target: { scope: 'global' } }) },
  { label: 'any transition',      install: (m, _) => m.hook_any_transition(() => true),                 row: _ => ({ kind: 'any transition',      phase: 'pre', target: { scope: 'global' } }) },
  { label: 'after any',           install: (m, _) => m.hook_after_any(() => true),                      row: _ => ({ kind: 'after any',           phase: 'pre', target: { scope: 'global' } }) },
  { label: 'pre everything',      install: (m, _) => m.hook_pre_everything(() => true),                 row: _ => ({ kind: 'pre everything',      phase: 'pre', target: { scope: 'global' } }) },
  { label: 'everything',          install: (m, _) => m.hook_everything(() => true),                     row: _ => ({ kind: 'everything',          phase: 'pre', target: { scope: 'global' } }) },

  // post-phase, targeted
  { label: 'post hook',           install: (m, x) => m.post_hook(x.from, x.to, () => true),             row: x => ({ kind: 'post hook',  phase: 'post', target: { scope: 'edge', from: x.from, to: x.to } }) },
  { label: 'post named',          install: (m, x) => m.post_hook_action(x.from, x.to, x.a, () => true), row: x => ({ kind: 'post named', phase: 'post', target: { scope: 'edge', from: x.from, to: x.to, action: x.a } }) },
  { label: 'post entry',          install: (m, x) => m.post_hook_entry(x.s, () => true),                row: x => ({ kind: 'post entry', phase: 'post', target: { scope: 'state', state: x.s } }) },
  { label: 'post exit',           install: (m, x) => m.post_hook_exit(x.s, () => true),                 row: x => ({ kind: 'post exit',  phase: 'post', target: { scope: 'state', state: x.s } }) },
  { label: 'post global action',  install: (m, x) => m.post_hook_global_action(x.a, () => true),        row: x => ({ kind: 'post global action', phase: 'post', target: { scope: 'action', action: x.a } }) },

  // post-phase, global singletons
  { label: 'post any action',          install: (m, _) => m.post_hook_any_action(() => true),           row: _ => ({ kind: 'post any action',          phase: 'post', target: { scope: 'global' } }) },
  { label: 'post standard transition', install: (m, _) => m.post_hook_standard_transition(() => true),  row: _ => ({ kind: 'post standard transition', phase: 'post', target: { scope: 'global' } }) },
  { label: 'post main transition',     install: (m, _) => m.post_hook_main_transition(() => true),      row: _ => ({ kind: 'post main transition',     phase: 'post', target: { scope: 'global' } }) },
  { label: 'post forced transition',   install: (m, _) => m.post_hook_forced_transition(() => true),    row: _ => ({ kind: 'post forced transition',   phase: 'post', target: { scope: 'global' } }) },
  { label: 'post any transition',      install: (m, _) => m.post_hook_any_transition(() => true),       row: _ => ({ kind: 'post any transition',      phase: 'post', target: { scope: 'global' } }) },
  { label: 'pre post everything',      install: (m, _) => m.hook_pre_post_everything(() => true),       row: _ => ({ kind: 'pre post everything',      phase: 'post', target: { scope: 'global' } }) },
  { label: 'post everything',          install: (m, _) => m.hook_post_everything(() => true),           row: _ => ({ kind: 'post everything',          phase: 'post', target: { scope: 'global' } }) }

];



/** Which boundary directions an FSL `on enter|exit` subject declares. */
type BoundaryMode = 'none' | 'enter' | 'exit' | 'both';



/**
 *  A fully constructed hook plan: the machine FSL, the concrete
 *  hook-installation calls to make, and the complete expected registry
 *  derived from the recipe.
 */
type HookPlan = {
  names    : string[],
  actions  : string[],
  edges    : [string, string, string][],   // [from, to, action]
  fsl      : string,
  installs : { entry: CatalogEntry, sel: HookSelector }[],
  expected : HookRegistryEntry[],
  group    : { name: string, members: string[], mode: BoundaryMode } | null,
  bstate   : { state: string, mode: BoundaryMode } | null
};



/** Appends the rows an FSL boundary declaration produces for one subject. */
const boundary_rows = (
  mode       : BoundaryMode,
  enter_kind : string,
  exit_kind  : string,
  target     : object
): HookRegistryEntry[] => {

  const rows: HookRegistryEntry[] = [];

  if (mode === 'enter' || mode === 'both') { rows.push({ kind: enter_kind, phase: 'post', target } as HookRegistryEntry); }
  if (mode === 'exit'  || mode === 'both') { rows.push({ kind: exit_kind,  phase: 'post', target } as HookRegistryEntry); }

  return rows;

};



/**
 *  Arbitrary for a {@link HookPlan}: a chain machine `st0 'act0' -> st1 ...`,
 *  a random subset of the 26-kind catalog with random targets, and random
 *  boundary declarations for one state subject and one group subject.
 */
const hook_plan_arb: fc.Arbitrary<HookPlan> = fc.record({

  k        : fc.integer({ min: 2, max: 5 }),
  picks    : fc.array(fc.boolean(),  { minLength: catalog.length, maxLength: catalog.length }),
  seeds    : fc.array(fc.nat(996),   { minLength: catalog.length, maxLength: catalog.length }),
  bs_seed  : fc.nat(996),
  bs_mode  : fc.constantFrom<BoundaryMode>('none', 'enter', 'exit', 'both'),
  gr_mode  : fc.constantFrom<BoundaryMode>('none', 'enter', 'exit', 'both'),
  gr_flags : fc.array(fc.boolean(),  { minLength: 5, maxLength: 5 })

}).map( ({ k, picks, seeds, bs_seed, bs_mode, gr_mode, gr_flags }) => {

  const names   = Array.from({ length: k },     (_, i) => `st${i}`  );
  const actions = Array.from({ length: k - 1 }, (_, i) => `act${i}` );

  const edges = actions.map( (a, i): [string, string, string] => [names[i], names[i + 1], a] );

  const parts: string[] = edges.map( ([f, t, a]) => `${f} '${a}' -> ${t};` );

  // group subject: declared whenever it has members; boundary decls per mode
  let group: HookPlan['group'] = null;

  const raw_members = names.filter( (_n, i) => gr_flags[i % gr_flags.length] );
  const members     = (raw_members.length === 0 && gr_mode !== 'none') ? [names[0]] : raw_members;

  if (members.length > 0) {
    group = { name: 'grp', members, mode: gr_mode };
    parts.push(`&grp : [${members.join(' ')}];`);
    if (gr_mode === 'enter' || gr_mode === 'both') { parts.push(`on enter &grp do 'grp_in';`);  }
    if (gr_mode === 'exit'  || gr_mode === 'both') { parts.push(`on exit &grp do 'grp_out';`); }
  }

  // state boundary subject
  let bstate: HookPlan['bstate'] = null;

  if (bs_mode !== 'none') {
    const s = names[bs_seed % k];
    bstate  = { state: s, mode: bs_mode };
    if (bs_mode === 'enter' || bs_mode === 'both') { parts.push(`on enter ${s} do 'sb_in';`);  }
    if (bs_mode === 'exit'  || bs_mode === 'both') { parts.push(`on exit ${s} do 'sb_out';`); }
  }

  const fsl = parts.join('  ');

  // catalog picks, each with a plan-drawn selector
  const installs: HookPlan['installs'] = [];

  for (const [i, entry] of catalog.entries()) {

    if (picks[i] === false) { continue; }  // picks is a fixed-length boolean array; index access is a value read, not an existence check

    const ei  = seeds[i] % edges.length;
    const sel : HookSelector = {
      s    : names[seeds[i] % k],
      from : edges[ei][0],
      to   : edges[ei][1],
      a    : edges[ei][2]
    };

    installs.push({ entry, sel });

  }

  const expected: HookRegistryEntry[] = [
    ...installs.map( ({ entry, sel }) => entry.row(sel) ),
    ...(group  ? boundary_rows(group.mode,  'group enter', 'group exit', { scope: 'group', group: group.name })   : []),
    ...(bstate ? boundary_rows(bstate.mode, 'state enter', 'state exit', { scope: 'state', state: bstate.state }) : [])
  ];

  return { names, actions, edges, fsl, installs, expected, group, bstate };

});



/** Builds the plan's machine and applies every planned hook installation. */
const build_machine = (plan: HookPlan) => {

  const m = jssm.from(plan.fsl);

  for (const { entry, sel } of plan.installs) { entry.install(m, sel); }

  return m;

};



/** Canonicalizes a registry row for order-insensitive multiset comparison. */
const canon = (e: HookRegistryEntry): string => {
  const t: any = e.target;
  return JSON.stringify([e.kind, e.phase, t.scope, t.state, t.from, t.to, t.action, t.group]);
};



/** Sorted canonical projection of a row list, for multiset equality. */
const canon_sorted = (rows: HookRegistryEntry[]): string[] =>
  rows.map(canon).sort(code_unit_compare);



/** Does a row reference the state, per the documented hooks_on contract? */
const touches_state = (e: HookRegistryEntry, s: string): boolean => {
  const t: any = e.target;
  if (t.scope === 'state') { return t.state === s; }
  if (t.scope === 'edge')  { return t.from  === s || t.to === s; }
  return false;
};





describe('hook_registry — generated registry matches the construction recipe', () => {

  test('registry rows are exactly the installed hooks plus boundary declarations, as a multiset', () => {

    fc.assert(
      fc.property(
        hook_plan_arb,
        (plan) => {

          const m = build_machine(plan);

          expect( canon_sorted(m.hook_registry()) ).toEqual( canon_sorted(plan.expected) );

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('hooks_on / has_hook / state_has_hooks — state queries', () => {

  test('state queries return exactly the plan rows touching that state, and the predicates agree', () => {

    fc.assert(
      fc.property(
        hook_plan_arb,
        (plan) => {

          const m = build_machine(plan);

          for (const s of [...plan.names, 'no_such_state']) {

            const expected_rows = plan.expected.filter( e => touches_state(e, s) );

            expect( canon_sorted(m.hooks_on(s)) ).toEqual( canon_sorted(expected_rows) );

            expect( m.has_hook(s)         ).toBe( expected_rows.length > 0 );
            expect( m.state_has_hooks(s)  ).toBe( expected_rows.length > 0 );

            for (const phase of ['pre', 'post'] as HookPhase[]) {
              expect( m.has_hook(s, phase) ).toBe( expected_rows.some( e => e.phase === phase ) );
            }

          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('hooks_on / has_hook — edge queries', () => {

  test('edge queries return exactly the plan edge rows, action-narrowed when an action is supplied', () => {

    fc.assert(
      fc.property(
        hook_plan_arb,
        (plan) => {

          const m = build_machine(plan);

          const edge_rows = (from: string, to: string) =>
            plan.expected.filter( (e) => {
              const t: any = e.target;
              return t.scope === 'edge' && t.from === from && t.to === to;
            });

          for (const [from, to, action] of plan.edges) {

            const on_edge = edge_rows(from, to);

            // action omitted: every hook on that edge, named or not
            expect( canon_sorted(m.hooks_on({ from, to })) ).toEqual( canon_sorted(on_edge) );

            // the edge's own action: only rows carrying exactly that action
            expect( canon_sorted(m.hooks_on({ from, to, action })) )
              .toEqual( canon_sorted(on_edge.filter( e => (e.target as any).action === action )) );

            // a bogus action matches nothing, even when unnamed hooks exist
            expect( m.hooks_on({ from, to, action: 'no_such_action' }) ).toStrictEqual([]);

            // the reversed edge was never declared or hooked in a chain plan
            expect( canon_sorted(m.hooks_on({ from: to, to: from })) ).toEqual( canon_sorted(edge_rows(to, from)) );

            expect( m.has_hook({ from, to }) ).toBe( on_edge.length > 0 );

          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('hooks_on / has_hook — action queries', () => {

  test('action queries return exactly the global-action and named-edge rows carrying that action', () => {

    fc.assert(
      fc.property(
        hook_plan_arb,
        (plan) => {

          const m = build_machine(plan);

          for (const action of [...plan.actions, 'no_such_action']) {

            const expected_rows = plan.expected.filter( (e) => {
              const t: any = e.target;
              if (t.scope === 'action') { return t.action === action; }
              if (t.scope === 'edge')   { return t.action === action; }
              return false;
            });

            expect( canon_sorted(m.hooks_on({ action })) ).toEqual( canon_sorted(expected_rows) );
            expect( m.has_hook({ action }) ).toBe( expected_rows.length > 0 );

            for (const phase of ['pre', 'post'] as HookPhase[]) {
              expect( m.has_hook({ action }, phase) ).toBe( expected_rows.some( e => e.phase === phase ) );
            }

          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('hooks_on / has_hook — group queries', () => {

  test('group queries return exactly the declared group-boundary rows; members never inherit them', () => {

    fc.assert(
      fc.property(
        hook_plan_arb,
        (plan) => {

          const m = build_machine(plan);

          const group_rows = plan.group === null
            ? []
            : plan.expected.filter( e => (e.target as any).scope === 'group' && (e.target as any).group === plan.group!.name );

          if (plan.group !== null) {

            expect( canon_sorted(m.hooks_on({ group: plan.group.name })) ).toEqual( canon_sorted(group_rows) );
            expect( m.has_hook({ group: plan.group.name }) ).toBe( group_rows.length > 0 );

            // group-boundary rows never surface through a member-state query
            for (const member of plan.group.members) {
              for (const row of m.hooks_on(member)) {
                expect( (row.target as any).scope ).not.toBe('group');
              }
            }

          }

          // a group name that was never declared matches nothing
          expect( m.hooks_on({ group: 'no_such_group' }) ).toStrictEqual([]);
          expect( m.has_hook({ group: 'no_such_group' }) ).toBe(false);

        }
      ),
      { numRuns: RUNS }
    );

  });

});
