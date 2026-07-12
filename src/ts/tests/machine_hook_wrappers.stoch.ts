
import * as fc from 'fast-check';

import * as jssm from '../jssm';





// Stochastic coverage for the hook registry surface of `src/ts/jssm.ts`
// (roughly lines 3430-4470): `off()` on unknown event names, `set_hook`
// descriptor validation, the registration wrappers that were previously
// uncalled (`hook_after`, `hook_after_any`, and the `post_hook_*` family),
// and the `remove_hook` arms for singleton and interned-key kinds.  Part of
// the fsl#651 / fsl#556 literal-100% stoch-coverage drive.
//
// Expectations derive from the descriptors and machines the tests build —
// hook firing is observed through spies fed by real dispatch, never by
// recomputing what the registry would say.



const RUNS = 40;



/** Arbitrary for a short lowercase alphabetic name fragment. */
const lc_fragment = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 1, maxLength: 5 }
);

/** Arbitrary for `n` distinct FSL-safe state names (index-suffixed). */
const distinct_names = (n: number): fc.Arbitrary<string[]> =>
  fc.array(lc_fragment, { minLength: n, maxLength: n })
    .map( bases => bases.map( (b, i) => `${b}${i}` ) );

/** Calls `set_hook` with a deliberately mis-shaped descriptor, bypassing the compile-time shape. */
const set_loose_hook = (machine: { set_hook: (d: never) => void }, desc: Record<string, unknown>): void =>
  (machine.set_hook as (d: unknown) => void)(desc);

/** Calls `remove_hook` with a loosely-typed descriptor. */
const remove_loose_hook = (machine: { remove_hook: (d: never) => boolean }, desc: Record<string, unknown>): boolean =>
  (machine.remove_hook as (d: unknown) => boolean)(desc);

/** A registerable hook handler that passes every transition. */
const passing_handler = () => true;

/** A subscriber that observes nothing; only its identity matters. */
const silent_subscriber = () => { /* deliberately empty */ };





describe('off() without any subscription set', () => {

  test('returns false for an event name that never had a subscriber', () => {

    fc.assert(
      fc.property(
        distinct_names(2),
        ([a, b]) => {
          const machine = jssm.from(`${a} -> ${b};`);
          expect(machine.off('entry', silent_subscriber)).toBe(false);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('returns false past a populated set whose entries do not match, leaving them live', () => {

    fc.assert(
      fc.property(
        distinct_names(2),
        ([a, b]) => {

          const machine = jssm.from(`${a} -> ${b};`);

          let fires = 0;
          const live_handler = () => { ++fires; };

          machine.on('transition', live_handler);

          // a different reference walks the whole set without matching
          expect(machine.off('transition', silent_subscriber)).toBe(false);

          machine.go(b);
          expect(fires).toBe(1);   // the non-matching off disturbed nothing

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a stale unsubscribe closure is idempotent and cannot damage later subscriptions', () => {

    fc.assert(
      fc.property(
        distinct_names(3),
        ([a, b, c]) => {

          const machine = jssm.from(`${a} -> ${b} -> ${c};`);

          let early = 0,
              late  = 0;

          const unsubscribe = machine.on('transition', () => { ++early; });

          unsubscribe();
          unsubscribe();   // second call finds nothing to delete

          // were the listener count driven negative, the commit-path event
          // gate would read 0 after this registration and suppress delivery
          machine.on('transition', () => { ++late; });

          machine.go(b);

          expect(early).toBe(0);
          expect(late).toBe(1);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





// The identifying spatial fields each keyed kind requires; mirrors the
// public contract documented on set_hook (#734, fsl#653, fsl#659).
const keyed_kinds: ReadonlyArray<[string, ReadonlyArray<'from' | 'to' | 'action'>]> = [
  ['hook',          ['from', 'to']],
  ['named',         ['from', 'to', 'action']],
  ['global action', ['action']],
  ['entry',         ['to']],
  ['exit',          ['from']],
  ['after',         ['from']],
  ['post hook',     ['from', 'to']],
  ['post named',    ['from', 'to', 'action']],
  ['post entry',    ['to']],
  ['post exit',     ['from']],
];

const keyless_kinds: ReadonlyArray<string> = [
  'any action', 'standard transition', 'main transition', 'forced transition',
  'any transition', 'after any', 'post any action', 'post any transition',
  'pre everything', 'everything', 'pre post everything', 'post everything',
];



/**
 *  Asserts that every spatial field a kind does not take is rejected by
 *  `set_hook` when supplied anyway, given an otherwise-complete descriptor.
 *  @param machine  The machine whose registry is being probed.
 *  @param machine.set_hook The registration entry point under test.
 *  @param complete A descriptor that would register successfully as-is.
 *  @param required The kind's required spatial fields.
 *  @param fills    Valid values keyed by spatial field name.
 */
const expect_stray_fields_rejected = (
  machine  : { set_hook: (d: never) => void },
  complete : Record<string, unknown>,
  required : ReadonlyArray<'from' | 'to' | 'action'>,
  fills    : Record<string, string>
): void => {
  for (const stray of ['from', 'to', 'action'] as const) {
    if (required.includes(stray)) { continue; }
    expect( () => set_loose_hook(machine, { ...complete, [stray]: fills[stray] }) )
      .toThrow(new RegExp(`does not take '${stray}'`));
  }
};



describe('set_hook descriptor validation', () => {

  test('rejects unknown kinds, non-function handlers, missing/empty keys, and stray keys', () => {

    fc.assert(
      fc.property(
        distinct_names(2), lc_fragment,
        ([a, b], act) => {

          const machine = jssm.from(`${a} '${act}' -> ${b};`);
          const fills: Record<string, string> = { from: a, to: b, action: act };

          expect( () => set_loose_hook(machine, { kind: 'no such kind', handler: () => true }) )
            .toThrow(/unknown hook kind/);

          for (const [kind, required] of keyed_kinds) {

            const complete: Record<string, unknown> = { kind, handler: () => true };
            for (const f of required) { complete[f] = fills[f]; }

            // non-function handler
            expect( () => set_loose_hook(machine, { ...complete, handler: 42 }) )
              .toThrow(/requires a handler function/);

            for (const f of required) {

              // required key absent
              const missing = { ...complete };
              delete missing[f];
              expect( () => set_loose_hook(machine, missing) )
                .toThrow(new RegExp(`requires '${f}' to be a non-empty string`));

              // required key present but unusable as a key
              expect( () => set_loose_hook(machine, { ...complete, [f]: '' }) )
                .toThrow(new RegExp(`requires '${f}' to be a non-empty string`));

            }

            // every spatial field this kind does not take is rejected when present
            expect_stray_fields_rejected(machine, complete, required, fills);

          }

          for (const kind of keyless_kinds) {

            expect( () => set_loose_hook(machine, { kind, handler: 'nope' }) )
              .toThrow(/requires a handler function/);

            expect( () => set_loose_hook(machine, { kind, handler: () => true, from: a }) )
              .toThrow(/does not take 'from'/);

          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('singleton register/remove round trips', () => {

  test('remove is false before install, true after, false again on the second try', () => {

    fc.assert(
      fc.property(
        distinct_names(2), lc_fragment,
        ([a, b], act) => {

          const machine = jssm.from(`${a} '${act}' -> ${b};`);

          const rows: ReadonlyArray<[() => unknown, Record<string, unknown>]> = [
            [ () => machine.hook_main_transition(passing_handler),      { kind: 'main transition' } ],
            [ () => machine.hook_after_any(passing_handler),            { kind: 'after any' } ],
            [ () => machine.post_hook_main_transition(passing_handler), { kind: 'post main transition' } ],
            [ () => machine.hook_after(a, passing_handler),             { kind: 'after', from: a } ],
          ];

          for (const [install, desc] of rows) {
            expect(remove_loose_hook(machine, desc)).toBe(false);   // nothing installed yet
            install();
            expect(remove_loose_hook(machine, desc)).toBe(true);    // present exactly once
            expect(remove_loose_hook(machine, desc)).toBe(false);   // already gone
          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('named / post-named removal key resolution', () => {

  test('unknown state or action names report false without disturbing the registered hook', () => {

    fc.assert(
      fc.property(
        distinct_names(2), lc_fragment,
        ([a, b], act) => {

          const machine = jssm.from(`${a} '${act}' -> ${b};`);

          machine.hook_action(a, b, act, passing_handler);
          machine.post_hook_action(a, b, act, passing_handler);

          for (const kind of ['named', 'post named']) {

            // never-interned state names: id lookup fails, nothing removed
            expect(remove_loose_hook(machine, { kind, from: `${a}_`, to: `${b}_`, action: act }))
              .toBe(false);

            // real pair, never-interned action name
            expect(remove_loose_hook(machine, { kind, from: a, to: b, action: `${act}_` }))
              .toBe(false);

            // the registered slot itself
            expect(remove_loose_hook(machine, { kind, from: a, to: b, action: act })).toBe(true);
            expect(remove_loose_hook(machine, { kind, from: a, to: b, action: act })).toBe(false);

          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('second named registration on an existing pair', () => {

  test('two actions hooked on the same (from, to) pair share the pair slot and fire independently', () => {

    fc.assert(
      fc.property(
        distinct_names(2),
        fc.tuple(lc_fragment, lc_fragment, lc_fragment).map( ([x, y, z]) => [`${x}q`, `${y}z`, `${z}r`] ),
        ([a, b], [act_one, act_two, act_back]) => {

          const machine = jssm.from(
            `${a} '${act_one}' -> ${b}; ${a} '${act_two}' -> ${b}; ${b} '${act_back}' -> ${a};`
          );

          const pre_fired:  Array<string> = [];
          const post_fired: Array<string> = [];

          // the second registration of each family reuses the pair's inner map
          machine.hook_action(a, b, act_one, () => { pre_fired.push(act_one); return true; });
          machine.hook_action(a, b, act_two, () => { pre_fired.push(act_two); return true; });
          machine.post_hook_action(a, b, act_one, () => { post_fired.push(act_one); });
          machine.post_hook_action(a, b, act_two, () => { post_fired.push(act_two); });

          expect(machine.action(act_two)).toBe(true);
          expect(machine.action(act_back)).toBe(true);
          expect(machine.action(act_one)).toBe(true);

          // each hook fired exactly for its own action, in dispatch order
          expect(pre_fired).toEqual([act_two, act_one]);
          expect(post_fired).toEqual([act_two, act_one]);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('post-hook wrapper family fires after real dispatch', () => {

  test('each wrapper observes exactly the transitions it is keyed to, with the right context', () => {

    fc.assert(
      fc.property(
        distinct_names(2), lc_fragment,
        ([a, b], act) => {

          type Install = (m: ReturnType<typeof jssm.from>, spy: (ctx: { from?: string, to?: string, action?: string }) => void) => void;

          const rows: ReadonlyArray<[string, Install]> = [
            [ 'post_hook_action',        (m, spy) => { m.post_hook_action(a, b, act, spy); } ],
            [ 'post_hook_global_action', (m, spy) => { m.post_hook_global_action(act, spy); } ],
            [ 'post_hook_any_action',    (m, spy) => { m.post_hook_any_action(spy); } ],
            [ 'post_hook_entry',         (m, spy) => { m.post_hook_entry(b, spy); } ],
            [ 'post_hook_exit',          (m, spy) => { m.post_hook_exit(a, spy); } ],
          ];

          for (const [, install] of rows) {

            const machine = jssm.from(`${a} '${act}' -> ${b};`);

            const seen: Array<{ from?: string, to?: string, action?: string }> = [];
            install(machine, ctx => { seen.push(ctx); });

            expect(machine.action(act)).toBe(true);
            expect(machine.state()).toBe(b);           // post hooks cannot block

            expect(seen.length).toBe(1);
            expect(seen[0].from).toBe(a);
            expect(seen[0].to).toBe(b);

            // every post hook receives the full dispatch context, so the
            // action label rides along even for entry/exit keyed hooks
            expect(seen[0].action).toBe(act);

          }

        }
      ),
      { numRuns: RUNS }
    );

  });

});
