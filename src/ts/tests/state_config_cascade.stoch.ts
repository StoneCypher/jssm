
import * as fc from 'fast-check';

import * as jssm from '../jssm';

import { theme_mapping, base_theme } from '../jssm_theme';

import type { JssmStateConfig, FslTheme } from '../jssm_types';





// Stochastic coverage for the unified per-state config cascade
// (`jssm.ts` — `#groups_by_depth`, `#compose_state_config` group/hooked/end
// tiers, via the public `resolve_state_config`; coverage drive fsl#651/#652).
//
// Group-precedence properties construct machines whose group nesting depths
// and metadata are chosen by fast-check, then assert the resolved color
// against the winner the documented cascade rules pick from the plan.
// Layer properties (hooked, end) compare a machine against its identically
// built twin that differs by exactly one layer, asserting the resolved
// config equals the twin's config overlaid with that layer's published
// style objects — so every expectation derives from the recipe and the
// exported theme data, never from the code under test.



const RUNS = 40;



/** FSL color names paired with the compiler's canonical 8-digit hex forms. */
const PALETTE: [string, string][] = [
  ['red',    '#ff0000ff'],
  ['blue',   '#0000ffff'],
  ['green',  '#008000ff'],
  ['orange', '#ffa500ff']
];



/** All declarable theme names, plus null for "no theme declared". */
const theme_arb: fc.Arbitrary<FslTheme | null> =
  fc.constantFrom(null, 'default', 'modern', 'ocean', 'plain', 'bold');



/** The `theme: X;` FSL fragment for a picked theme, or nothing. */
const theme_decl = (theme: FslTheme | null): string =>
  (theme === null) ? '' : `theme: ${theme};`;



/**
 *  Overlays style layers onto a base config with the cascade's documented
 *  merge rule: later layers win per key, `undefined`-valued keys contribute
 *  nothing.
 *  @param base    The lower-precedence resolved config.
 *  @param layers  Higher-precedence style objects, least- to most-specific.
 *  @returns       The expected composite config.
 *  @example
 *    overlay({ shape: 'rectangle' }, { shape: 'component' })  // { shape: 'component' }
 */
const overlay = (base: JssmStateConfig, ...layers: (JssmStateConfig | undefined)[]): JssmStateConfig => {

  const acc: Record<string, unknown> = { ...base };

  for (const layer of layers) {
    if (layer === undefined) { continue; }
    for (const [key, value] of Object.entries(layer)) {
      if (value !== undefined) { acc[key] = value; }
    }
  }

  return acc as JssmStateConfig;

};



/** Simple chain FSL over `st0 .. st(k-1)`, one `->` edge per hop. */
const chain_fsl = (k: number): string =>
  Array.from({ length: k - 1 }, (_, i) => `st${i} -> st${i + 1};`).join(' ');





describe('group precedence — nesting depth', () => {

  test('a state in nested groups takes the inner group color; without inner metadata the outer flows through', () => {

    fc.assert(
      fc.property(
        fc.record({
          k        : fc.integer({ min: 3, max: 6 }),
          ci       : fc.nat(PALETTE.length - 1),
          offset   : fc.nat(PALETTE.length - 2),
          inn_meta : fc.boolean(),
          o_seed   : fc.nat(96)
        }),
        ({ k, ci, offset, inn_meta, o_seed }) => {

          const [inn_name, inn_hex] = PALETTE[ci];
          const [out_name, out_hex] = PALETTE[(ci + 1 + offset) % PALETTE.length];

          const member = `st1`;                                        // in &inn (d1) and &out (d2)
          const outer_only_candidates = Array.from({ length: k }, (_, i) => `st${i}`).filter( n => n !== member );
          const outer_only = outer_only_candidates[o_seed % outer_only_candidates.length];

          const fsl = [
            chain_fsl(k),
            `&inn : [${member}];`,
            `&out : [&inn ${outer_only}];`,
            `state &out : { color: ${out_name}; };`,
            inn_meta ? `state &inn : { color: ${inn_name}; };` : ''
          ].join(' ');

          const m = jssm.from(fsl);

          // the nested member resolves to the innermost declared metadata
          expect( m.resolve_state_config(member).color ).toBe( inn_meta ? inn_hex : out_hex );

          // the outer-only member never sees inner-group metadata
          expect( m.resolve_state_config(outer_only).color ).toBe(out_hex);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('group precedence — equal-depth ties and per-state override', () => {

  test('equal-depth groups tie-break to the later-declared group; a per-state block beats both', () => {

    fc.assert(
      fc.property(
        fc.record({
          k          : fc.integer({ min: 3, max: 6 }),
          ci         : fc.nat(PALETTE.length - 1),
          offset     : fc.nat(PALETTE.length - 2),
          swap_decl  : fc.boolean(),
          per_state  : fc.boolean()
        }),
        ({ k, ci, offset, swap_decl, per_state }) => {

          const [one_name, one_hex] = PALETTE[ci];
          const [two_name, two_hex] = PALETTE[(ci + 1 + offset) % PALETTE.length];
          const per_state_pick      = PALETTE[(ci + 2 + offset) % PALETTE.length];

          const member = 'st1';

          const decls  = [`&one : [${member}];`, `&two : [${member}];`];
          if (swap_decl) { decls.reverse(); }

          const fsl = [
            chain_fsl(k),
            ...decls,
            `state &one : { color: ${one_name}; };`,
            `state &two : { color: ${two_name}; };`,
            per_state ? `state ${member} : { color: ${per_state_pick[0]}; };` : ''
          ].join(' ');

          const m = jssm.from(fsl);

          // both groups hold the member at distance 1; the later-declared
          // group wins the tie — unless the per-state block overrides both
          const later_hex = swap_decl ? one_hex : two_hex;

          expect( m.resolve_state_config(member).color )
            .toBe( per_state ? per_state_pick[1] : later_hex );

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('hooked-state layer', () => {

  test('hooking a state folds exactly the published hooked layers over its unhooked twin config', () => {

    fc.assert(
      fc.property(
        fc.record({
          k        : fc.integer({ min: 3, max: 6 }),
          theme    : theme_arb,
          hook_via : fc.constantFrom('entry', 'exit', 'after', 'edge'),
          m_seed   : fc.nat(96)
        }),
        ({ k, theme, hook_via, m_seed }) => {

          // a middle state: never the start, never terminal, never current
          const mid = `st${1 + (m_seed % (k - 2))}`;

          const fsl = `${theme_decl(theme)} ${chain_fsl(k)}`;

          const twin   = jssm.from(fsl);
          const hooked = jssm.from(fsl);

          switch (hook_via) {
            case 'entry': { hooked.hook_entry(mid, () => true); break;
            }
            case 'exit': {  hooked.hook_exit(mid, () => true);  break;
            }
            case 'after': { hooked.hook_after(mid, () => true); break;
            }
            case 'edge': {  hooked.hook(mid, `st${Number(mid.slice(2)) + 1}`, () => true); break;
            }
          }

          const theme_impl = (theme === null) ? undefined : theme_mapping.get(theme);

          expect( hooked.resolve_state_config(mid) ).toStrictEqual(
            overlay( twin.resolve_state_config(mid), base_theme.hooked, theme_impl?.hooked )
          );

          // an unhooked sibling state resolves identically on both machines
          const sibling = (mid === 'st1') ? 'st2' : 'st1';
          if (hook_via !== 'edge') {
            expect( hooked.resolve_state_config(sibling) ).toStrictEqual( twin.resolve_state_config(sibling) );
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('partial and unregistered themes — per-block guard arms', () => {

  // Every registered theme may omit any per-kind block ({@link JssmTheme} is
  // Partial); #compose_state_config guards each block with `if (theme.X)`,
  // and #resolved_themes silently skips theme names absent from
  // theme_mapping.  A probe theme carrying a random SUBSET of blocks — each
  // block setting a key no other cascade layer touches — makes the expected
  // composite exactly "the twin resolved under an empty registered theme,
  // overlaid with the probe blocks that are both present and applicable to
  // the state's kinds".  theme_mapping.set is the documented registration
  // mechanism (see jssm_theme.ts).

  const BLOCKS = ['state', 'hooked', 'terminal', 'start', 'end', 'active'] as const;
  type Block = typeof BLOCKS[number];

  // per-block probe key/value; no base layer, machine style, or other probe
  // block writes these keys, so overlay order between blocks cannot matter
  const PROBE: Record<Block, [string, string]> = {
    state    : ['lineStyle',   'probe_state'],
    hooked   : ['corners',     'probe_hooked'],
    terminal : ['color',       'probe_terminal'],
    start    : ['image',       'probe_start'],
    end      : ['url',         'probe_end'],
    active   : ['borderColor', 'probe_active']
  };

  // None of these are members of FslTheme, deliberately: EMPTY_NAME and
  // PROBE_NAME are registered at runtime through `theme_mapping.set` — a
  // registration path whose keys the closed literal union cannot describe —
  // and BOGUS_NAME is never registered at all.  They are typed `string` (not
  // left as literal types) so the `as FslTheme` below are honest downcasts at
  // the theme_mapping boundary rather than impossible literal-to-literal
  // conversions.
  const EMPTY_NAME: string = 'stoch-probe-empty-theme',
        PROBE_NAME: string = 'stoch-probe-partial-theme',
        BOGUS_NAME: string = 'stoch-probe-never-registered';

  test('a probe theme lands exactly its present+applicable blocks; unregistered names vanish', () => {

    fc.assert(
      fc.property(
        fc.record({
          k      : fc.integer({ min: 4, max: 6 }),
          subset : fc.record({
            state    : fc.boolean(),
            hooked   : fc.boolean(),
            terminal : fc.boolean(),
            start    : fc.boolean(),
            end      : fc.boolean(),
            active   : fc.boolean()
          })
        }),
        ({ k, subset }) => {

          const names = Array.from({ length: k }, (_, i) => `st${i}` );

          // st0: start + active; st1: hooked; st2: end (k >= 4 keeps it
          // non-terminal); st(k-1): terminal; the state block applies to all
          const fsl = `${chain_fsl(k)} end_states: [st2];`;

          const probe: Record<string, unknown> = { name: PROBE_NAME };
          for (const block of BLOCKS) {
            if (subset[block] === false) { continue; }  // subset carries every Block key as a boolean; this is a value read, not an existence check
            const [key, value] = PROBE[block];
            probe[block] = { [key]: value };
          }

          theme_mapping.set(EMPTY_NAME as FslTheme, { name: EMPTY_NAME } as never);
          theme_mapping.set(PROBE_NAME as FslTheme, probe as never);

          try {

            const twin = jssm.from(fsl);
            twin.hook_entry('st1', () => true);
            twin.themes = [EMPTY_NAME as FslTheme];

            const m = jssm.from(fsl);
            m.hook_entry('st1', () => true);
            // Both names sit outside FslTheme's closed literal union on purpose:
            // PROBE_NAME is registered at runtime through theme_mapping (a path the
            // compile-time union cannot express), and BOGUS_NAME is never registered
            // at all.  The property under test *is* that the unregistered name
            // contributes nothing, so it must reach the setter unlaundered.
            // @ts-expect-error deliberately assigning unregistered theme names to prove they vanish
            m.themes = [PROBE_NAME, BOGUS_NAME];   // the bogus name must contribute nothing

            for (const s of names) {

              const kinds: Block[] = ['state'];
              if (s === 'st1')          { kinds.push('hooked');   }
              if (s === names[k - 1])   { kinds.push('terminal'); }
              if (s === 'st0')          { kinds.push('start', 'active'); }   // st0 is current
              else if (s === 'st2')     { kinds.push('end');      }          // 'st0' and 'st2' are mutually exclusive

              const layers = kinds
                .filter( block => subset[block] )
                .map( (block): JssmStateConfig => {
                  const [key, value] = PROBE[block];
                  return { [key]: value } as JssmStateConfig;
                });

              expect( m.resolve_state_config(s) )
                .toStrictEqual( overlay(twin.resolve_state_config(s), ...layers) );

            }

          } finally {
            theme_mapping.delete(EMPTY_NAME as FslTheme);
            theme_mapping.delete(PROBE_NAME as FslTheme);
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('cache coherence — interleaved mutations and resolves', () => {

  // resolve_state_config memoizes the static tiers per state, and both hook
  // presence (tier 2.5) and themes (tier 1 + per-kind theme layers) are
  // mutable after construction — so any interleaving of resolves (which
  // prime the memo), hook registrations/removals, and theme assignments
  // must end at the same resolution a fresh machine reaches when built
  // directly into the final hook/theme state.

  type CoherenceOp =
    | { op: 'resolve', seed: number }
    | { op: 'hook',    seed: number }
    | { op: 'unhook',  seed: number }
    | { op: 'theme',   pick: FslTheme | FslTheme[] };

  const named_theme = fc.constantFrom<FslTheme>('default', 'modern', 'ocean', 'plain', 'bold');

  const op_arb: fc.Arbitrary<CoherenceOp> = fc.oneof(
    fc.record({ op: fc.constant('resolve' as const), seed: fc.nat(96) }),
    fc.record({ op: fc.constant('hook'    as const), seed: fc.nat(96) }),
    fc.record({ op: fc.constant('unhook'  as const), seed: fc.nat(96) }),
    fc.record({ op: fc.constant('theme'   as const), pick: fc.oneof(named_theme, fc.tuple(named_theme, named_theme).map( t => [...t] )) })
  );

  /**
   *  Applies one {@link CoherenceOp} to the machine under test, mirroring
   *  hook ops into the shadow `hooked` set; hoisted out of the replay loop
   *  so the op dispatch carries no `break` inside a nested loop
   *  (unicorn/no-break-in-nested-loop).  Returns the theme assignment the
   *  op made, or `undefined` when the op does not touch themes, so the
   *  caller tracks the final theme state from the return value.
   *  @example
   *    apply_coherence_op(m, names, k, hooked, { op: 'theme', pick: 'ocean' })  // 'ocean'
   */
  const apply_coherence_op = (
    m      : ReturnType<typeof jssm.from>,
    names  : string[],
    k      : number,
    hooked : Set<string>,
    step   : CoherenceOp
  ): FslTheme | FslTheme[] | undefined => {

    switch (step.op) {

      case 'resolve': {
        m.resolve_state_config(names[step.seed % k]);   // primes the memo
        return undefined;
      }

      case 'hook': {
        const s = names[step.seed % k];
        m.hook_entry(s, () => true);
        hooked.add(s);
        return undefined;
      }

      case 'unhook': {
        const s = names[step.seed % k];
        m.remove_hook({ kind: 'entry', to: s, handler: () => true } as any);
        hooked.delete(s);
        return undefined;
      }

      case 'theme': {
        m.themes = step.pick;
        return step.pick;
      }

    }

  };

  test('every state resolves identically to a twin built directly into the final hook/theme state', () => {

    fc.assert(
      fc.property(
        fc.record({
          k   : fc.integer({ min: 3, max: 6 }),
          ops : fc.array(op_arb, { minLength: 1, maxLength: 12 })
        }),
        ({ k, ops }) => {

          const names = Array.from({ length: k }, (_, i) => `st${i}` );
          const fsl   = chain_fsl(k);

          const m = jssm.from(fsl);

          // shadow model of the machine's final mutable-cascade state
          const hooked                                   = new Set<string>();
          let   themes_now: FslTheme | FslTheme[] | null = null;

          for (const step of ops) {
            const assigned = apply_coherence_op(m, names, k, hooked, step);
            if (assigned !== undefined) { themes_now = assigned; }
          }

          // a twin built straight into the final state, never primed stale
          const twin = jssm.from(fsl);
          for (const s of hooked)  { twin.hook_entry(s, () => true); }
          if (themes_now !== null) { twin.themes = themes_now; }

          for (const s of names) {
            expect( m.resolve_state_config(s) ).toStrictEqual( twin.resolve_state_config(s) );
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('end-state layer', () => {

  test('declaring a state an end state folds exactly the published end layers over its twin config', () => {

    fc.assert(
      fc.property(
        fc.record({
          k      : fc.integer({ min: 3, max: 6 }),
          theme  : theme_arb,
          m_seed : fc.nat(96)
        }),
        ({ k, theme, m_seed }) => {

          // a middle state: not the start state, not terminal
          const mid = `st${1 + (m_seed % (k - 2))}`;

          const base_fsl = `${theme_decl(theme)} ${chain_fsl(k)}`;

          const twin  = jssm.from(base_fsl);
          const ended = jssm.from(`${base_fsl} end_states: [${mid}];`);

          const theme_impl = (theme === null) ? undefined : theme_mapping.get(theme);

          expect( ended.resolve_state_config(mid) ).toStrictEqual(
            overlay( twin.resolve_state_config(mid), base_theme.end, theme_impl?.end )
          );

          // a state not named in end_states resolves identically on both machines
          const sibling = (mid === 'st1') ? 'st2' : 'st1';
          expect( ended.resolve_state_config(sibling) ).toStrictEqual( twin.resolve_state_config(sibling) );

        }
      ),
      { numRuns: RUNS }
    );

  });

});
