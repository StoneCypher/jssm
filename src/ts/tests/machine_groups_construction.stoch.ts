
import * as fc   from 'fast-check';
import * as jssm from '../jssm';




// Property-based coverage for the overlapping-state-group construction
// tables (`src/ts/jssm.ts` constructor, roughly lines 944-982), part of the
// fsl#651 literal-100% stochastic coverage drive.
//
// Two constructor passes are pinned:
//
//   - group metadata (`state &g : { ... };`) condenses once per group and
//     surfaces through `resolve_state_config` for every transitive member;
//   - the deep inverse membership index behind `groupsOf` records every
//     group that directly, nestedly, or repeatedly contains a state.
//
// Expectations derive from the generated group plan (which states were put
// in which groups), never from machine internals.



const RUNS = 50;



/** Arbitrary for a short lowercase atom fragment. */
const atom_arb = fc.array(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 5 }
).map(arr => arr.join(''));



/**
 *  A generated flat-group plan: a chain of distinct states plus a set of
 *  named groups, each holding a chosen subset of those states.
 */
type GroupPlan = {
  states     : string[];
  fsl        : string;
  membership : Map<string, Set<string>>;   // state -> set of group names
};

/**
 *  Arbitrary for a {@link GroupPlan}: 3-6 chain states, 1-3 groups with
 *  random non-empty member subsets.  Group names are disjoint from state
 *  names by suffix.
 */
const group_plan_arb: fc.Arbitrary<GroupPlan> = fc.tuple(
  fc.array(atom_arb, { minLength: 3, maxLength: 6 }),
  fc.array(fc.tuple(atom_arb, fc.array(fc.nat(), { minLength: 1, maxLength: 4 })), { minLength: 1, maxLength: 3 })
).map( ([state_bases, raw_groups]) => {

  const states = state_bases.map( (b, i) => `${b}s${i}` );

  const membership: Map<string, Set<string>> = new Map( states.map( s => [s, new Set<string>()] ) );

  const group_decls: string[] = [];

  for (const [gi, [g_base, raw_members]] of raw_groups.entries()) {

    const g_name  = `${g_base}g${gi}`;
    const members = [ ...new Set( raw_members.map( m => states[m % states.length] ) ) ];

    for (const m of members) { membership.get(m).add(g_name); }
    group_decls.push(`&${g_name} : [${members.join(' ')}];`);

  }

  const chain = states.join(' -> ') + ';';
  const fsl   = `${chain}  ${group_decls.join('  ')}`;

  return { states, fsl, membership };

});





describe('groupsOf — deep inverse membership index', () => {

  test('every state reports exactly the groups the plan placed it in', () => {

    fc.assert(
      fc.property(group_plan_arb, ({ states, fsl, membership }) => {

        const machine = jssm.from(fsl);

        for (const s of states) {
          expect(machine.groupsOf(s)).toEqual(membership.get(s));
        }

      }),
      { numRuns: RUNS }
    );

  });

  test('nested groups count transitively: members of &inner are also members of &outer', () => {

    fc.assert(
      fc.property(
        fc.array(atom_arb, { minLength: 3, maxLength: 3 }),
        atom_arb, atom_arb,
        (state_bases, inner_base, outer_base) => {

          const [a, b, c] = state_bases.map( (s, i) => `${s}s${i}` );
          const inner     = `${inner_base}gi`;
          const outer     = `${outer_base}go`;

          const machine = jssm.from(
            `${a} -> ${b} -> ${c};  &${inner} : [${a} ${b}];  &${outer} : [&${inner} ${c}];`
          );

          expect(machine.groupsOf(a)).toEqual(new Set([inner, outer]));
          expect(machine.groupsOf(b)).toEqual(new Set([inner, outer]));
          expect(machine.groupsOf(c)).toEqual(new Set([outer]));

          expect(machine.groups()).toEqual([inner, outer]);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('group metadata — `state &g : { ... };` styles reach members through the cascade', () => {

  test('a group style block surfaces on every member, with the declared values', () => {

    fc.assert(
      fc.property(
        fc.array(atom_arb, { minLength: 3, maxLength: 3 }),
        atom_arb,
        fc.constantFrom('box', 'oval', 'diamond', 'octagon'),
        fc.constantFrom('solid', 'dotted', 'dashed'),
        (state_bases, g_base, shape, line_style) => {

          const [a, b, c] = state_bases.map( (s, i) => `${s}s${i}` );
          const g         = `${g_base}g0`;

          const machine = jssm.from(
            `${a} -> ${b} -> ${c};`
            + `  &${g} : [${a} ${b}];`
            + `  state &${g} : { shape: ${shape}; line-style: ${line_style}; };`
          );

          for (const member of [a, b]) {
            const cfg = machine.resolve_state_config(member);
            expect(cfg.shape).toBe(shape);
            expect(cfg.lineStyle).toBe(line_style);
          }

          // the non-member is in no group at all
          expect(machine.groupsOf(c)).toEqual(new Set());

        }
      ),
      { numRuns: RUNS }
    );

  });

});
