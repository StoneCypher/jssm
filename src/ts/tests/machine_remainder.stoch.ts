
import * as fc from 'fast-check';

import * as jssm from '../jssm';
import { Interner, pair_key } from '../jssm_intern';





// Property-based coverage for the remaining dark corners of `jssm.ts`:
// the low-level set_hook / remove_hook registry across every hook kind,
// event filters and the error-event machinery, hook data adoption,
// default style buckets, island detection, the long tail of getters,
// compareVersions' deep prerelease branches, and the string interner.



const RUNS = 50;



const word = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 2, maxLength: 8 }
);

/** Two-state action machine used by most registry tests: `ha <-> hb`,
 *  both hops carrying action 'act'. */
const HOOK_FSL = "ha 'act' -> hb;  hb 'act' -> ha;";





describe('set_hook / remove_hook across the full kind vocabulary', () => {

  /**
   *  One registry scenario: the descriptor (minus handler) for set_hook /
   *  remove_hook, and a stimulus that must invoke the hook exactly once on
   *  the HOOK_FSL machine starting at `ha`.
   */
  type Scenario = {
    kind     : string;
    keys     : Record<string, string>;
    stimulus : (m: jssm.Machine<unknown>) => void;
  };

  const act        = (m: jssm.Machine<unknown>) => { expect(m.action('act')).toBe(true); };
  const transition = (m: jssm.Machine<unknown>) => { expect(m.transition('hb')).toBe(true); };
  const force      = (m: jssm.Machine<unknown>) => { expect(m.force_transition('hb')).toBe(true); };

  const SCENARIOS: Scenario[] = [
    { kind: 'hook',                     keys: { from: 'ha', to: 'hb' },                stimulus: transition },
    { kind: 'named',                    keys: { from: 'ha', to: 'hb', action: 'act' }, stimulus: act },
    { kind: 'global action',            keys: { action: 'act' },                       stimulus: act },
    { kind: 'any action',               keys: {},                                      stimulus: act },
    { kind: 'standard transition',      keys: {},                                      stimulus: transition },
    { kind: 'forced transition',        keys: {},                                      stimulus: force },
    { kind: 'any transition',           keys: {},                                      stimulus: transition },
    { kind: 'entry',                    keys: { to: 'hb' },                            stimulus: transition },
    { kind: 'exit',                     keys: { from: 'ha' },                          stimulus: transition },
    { kind: 'post hook',                keys: { from: 'ha', to: 'hb' },                stimulus: transition },
    { kind: 'post named',               keys: { from: 'ha', to: 'hb', action: 'act' }, stimulus: act },
    { kind: 'post global action',       keys: { action: 'act' },                       stimulus: act },
    { kind: 'post any action',          keys: {},                                      stimulus: act },
    { kind: 'post standard transition', keys: {},                                      stimulus: transition },
    { kind: 'post forced transition',   keys: {},                                      stimulus: force },
    { kind: 'post any transition',      keys: {},                                      stimulus: transition },
    { kind: 'post entry',               keys: { to: 'hb' },                            stimulus: transition },
    { kind: 'post exit',                keys: { from: 'ha' },                          stimulus: transition },
    { kind: 'pre everything',           keys: {},                                      stimulus: transition },
    { kind: 'everything',               keys: {},                                      stimulus: transition },
    { kind: 'pre post everything',      keys: {},                                      stimulus: transition },
    { kind: 'post everything',          keys: {},                                      stimulus: transition }
  ];

  test('every kind installs, fires on its stimulus, removes exactly once, then stays silent', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...SCENARIOS),
        ({ kind, keys, stimulus }) => {

          const machine = jssm.from(HOOK_FSL);

          let registrations = 0,
              removals      = 0,
              calls         = 0;

          machine.on('hook-registration', () => { ++registrations; });
          machine.on('hook-removal',      () => { ++removals;      });

          const desc = { kind, ...keys, handler: () => { ++calls; return true; } };

          machine.set_hook(desc as never);
          expect(registrations).toBe(1);

          stimulus(machine);
          expect(calls).toBe(1);

          expect(machine.remove_hook(desc as never)).toBe(true);
          expect(removals).toBe(1);

          // back to `ha` if the stimulus moved us, so the re-stimulus matches
          if (machine.state() !== 'ha') { expect(machine.transition('ha')).toBe(true); }

          stimulus(machine);
          expect(calls).toBe(1);   // removed hooks stay silent

          // second removal finds nothing
          expect(machine.remove_hook(desc as never)).toBe(false);
          expect(removals).toBe(1);

        }
      ),
      { numRuns: 120 }
    );

  });

  test('unknown hook kinds throw from both set_hook and remove_hook', () => {

    fc.assert(
      fc.property(
        word.map( w => `not a kind ${w}` ),
        (kind) => {
          const machine = jssm.from(HOOK_FSL);
          // set_hook validates the descriptor up front (#734); remove_hook
          // still rejects an unknown kind via its switch default.
          expect(() => machine.set_hook({ kind, handler: () => true } as never)).toThrow(/unknown hook kind/);
          expect(() => machine.remove_hook({ kind, handler: () => true } as never)).toThrow(/Unknown hook type/);
        }
      ),
      { numRuns: 20 }
    );

  });

  test("the 'after' kind registers and removes through the same registry", () => {

    const machine = jssm.from(HOOK_FSL);
    const desc    = { kind: 'after', from: 'ha', handler: () => true };

    machine.set_hook(desc as never);
    expect(machine.remove_hook(desc as never)).toBe(true);
    expect(machine.remove_hook(desc as never)).toBe(false);

  });

});





describe('event filters and the error event', () => {

  test('a filtered on() fires only for matching detail fields', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        (laps) => {

          const machine = jssm.from(HOOK_FSL);

          let to_hb = 0,
              all   = 0;

          machine.on('transition', { to: 'hb' }, () => { ++to_hb; });
          machine.on('transition', () => { ++all; });

          for (let s = 0; s < laps; ++s) {
            expect(machine.transition(s % 2 === 0 ? 'hb' : 'ha')).toBe(true);
          }

          expect(all).toBe(laps);
          expect(to_hb).toBe(Math.ceil(laps / 2));   // ha->hb on even steps

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('non-function handlers are rejected at subscription time', () => {

    const machine = jssm.from(HOOK_FSL);

    expect(() => machine.on('transition', 'not a function' as never)).toThrow(/must be a function/);
    expect(() => machine.on('transition', { to: 'hb' }, undefined as never)).toThrow(/must be a function/);

  });

  test("a throwing handler emits an 'error' event naming the source; later handlers still run", () => {

    fc.assert(
      fc.property(
        word,
        (msg) => {

          const machine = jssm.from(HOOK_FSL);

          const errors: Array<{ source: string, message: string }> = [];
          let later_ran = 0;

          machine.on('error', (d) => {
            errors.push({ source: d.source_event as string, message: (d.error as Error).message });
          });

          machine.on('transition', () => { throw new Error(msg); });
          machine.on('transition', () => { ++later_ran; });

          expect(machine.transition('hb')).toBe(true);

          expect(errors).toEqual([ { source: 'transition', message: msg } ]);
          expect(later_ran).toBe(1);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test("a throwing 'error' handler falls back to console.error instead of recursing", () => {

    const machine = jssm.from(HOOK_FSL);

    const console_error    = console.error;
    let   console_payloads = 0;
    console.error = () => { ++console_payloads; };

    try {

      machine.on('error', () => { throw new Error('handler exploded'); });
      machine.on('transition', () => { throw new Error('original'); });

      expect(machine.transition('hb')).toBe(true);
      expect(console_payloads).toBe(1);

    } finally {
      console.error = console_error;
    }

  });

});





describe('hook data adoption', () => {

  test('a complex pass result with data replaces the machine data', () => {

    fc.assert(
      fc.property(
        fc.integer(), fc.integer(),
        (before, after) => {

          const machine = jssm.from(HOOK_FSL, { data: before });

          machine.hook('ha', 'hb', () => ({ pass: true, data: after }));

          expect(machine.data()).toBe(before);
          expect(machine.transition('hb')).toBe(true);
          expect(machine.data()).toBe(after);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('a complex rejection with data does not move the machine or replace its data', () => {

    fc.assert(
      fc.property(
        fc.integer(), fc.integer(),
        (before, ignored) => {

          const machine = jssm.from(HOOK_FSL, { data: before });

          machine.hook('ha', 'hb', () => ({ pass: false, data: ignored }));

          expect(machine.transition('hb')).toBe(false);
          expect(machine.state()).toBe('ha');
          expect(machine.data()).toBe(before);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('default style buckets', () => {

  const BUCKETS: Array<[string, (m: jssm.Machine<unknown>) => Record<string, unknown>]> = [
    [ 'state',          m => m.standard_state_style as Record<string, unknown> ],
    [ 'active_state',   m => m.active_state_style   as Record<string, unknown> ],
    [ 'hooked_state',   m => m.hooked_state_style   as Record<string, unknown> ],
    [ 'terminal_state', m => m.terminal_state_style as Record<string, unknown> ],
    [ 'start_state',    m => m.start_state_style    as Record<string, unknown> ],
    [ 'end_state',      m => m.end_state_style      as Record<string, unknown> ]
  ];

  const STYLE_KEYS: Array<[string, string, string]> = [
    [ 'shape: hexagon;',           'shape',           'hexagon'   ],
    [ 'corners: rounded;',         'corners',         'rounded'   ],
    // named colors normalize to 8-digit hex at parse time
    [ 'background-color: orchid;', 'backgroundColor', '#da70d6ff' ]
  ];

  test('each bucket condenses its kebab-case keys into the matching camelCase config', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...BUCKETS),
        fc.constantFrom(...STYLE_KEYS),
        ([bucket, read], [fsl_key, field, value]) => {

          const machine = jssm.from(`${bucket}: { ${fsl_key} };  sa -> sb;`);

          expect(read(machine)[field]).toBe(value);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('redefining a key inside one bucket throws at construction', () => {

    expect(() => jssm.from('state: { shape: box; shape: circle; };  sa -> sb;'))
      .toThrow(/redefine/);

  });

});





describe('islands', () => {

  test('disconnected graphs construct by default and refuse under allow_islands: false', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 4 }),
        (component_count) => {

          const parts = [...new Array(component_count).keys()]
            .map( i => `i${i}a -> i${i}b;` );
          const fsl = parts.join('  ');

          // default: islands are legal, every state lands
          const open = jssm.from(fsl);
          expect(open.states().length).toBe(component_count * 2);

          if (component_count > 1) {
            expect(() => jssm.from(`allow_islands: false;  ${fsl}`)).toThrow();
          } else {
            expect(() => jssm.from(`allow_islands: false;  ${fsl}`)).not.toThrow();
          }

        }
      ),
      { numRuns: 25 }
    );

  });

});





describe('getter long tail', () => {

  test('descriptive machine attributes round-trip', () => {

    fc.assert(
      fc.property(
        word, word,
        (def_word, contributor) => {

          // machine_definition takes a bare URL token, not a quoted string —
          // and since ';' is a legal URL character, the URL must be separated
          // from the statement terminator by whitespace
          const machine = jssm.from(`
            machine_definition  : https://example.com/${def_word} ;
            machine_language    : english;
            machine_contributor : "${contributor}";
            ga -> gb;
          `);

          expect(machine.machine_definition()).toBe(`https://example.com/${def_word}`);
          // language names normalize to ISO 639-1 codes via reduce-to-639-1
          expect(machine.machine_language()).toBe('en');
          expect(machine.machine_contributor()).toEqual([contributor]);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('state declaration surfaces agree with the declared block', () => {

    fc.assert(
      fc.property(
        fc.constantFrom('circle', 'hexagon', 'diamond'),
        (shape) => {

          const machine = jssm.from(`ga -> gb;  state ga: { shape: ${shape}; };`);

          expect(machine.state_declaration('ga').shape).toBe(shape);
          expect(machine.state_declarations().get('ga')?.shape).toBe(shape);
          expect(machine.raw_state_declarations().length).toBe(1);
          expect(machine.style_for('ga').shape).toBe(shape);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('structural inspection: machine_state, list_transitions, probable_action_exits, multi-state actions', () => {

    const machine = jssm.from("[ma mb] 'go' -> mc;  mc -> ma;");

    expect(machine.list_states_having_action('go').sort()).toEqual(['ma', 'mb']);
    expect(machine.probable_action_exits('ma').length).toBe(1);

    const transitions = machine.list_transitions('mc');
    expect(transitions.entrances.sort()).toEqual(['ma', 'mb']);
    expect(transitions.exits).toEqual(['ma']);

    const internals = machine.machine_state();
    expect(internals.internal_state_impl_version).toBeDefined();

    expect(machine.creation_date instanceof Date).toBe(true);

  });

  test('the machine-level sm template method builds independent machines', () => {

    const host  = jssm.from('ga -> gb;');
    const built = host.sm`xa -> xb;`;

    expect(built.states().sort()).toEqual(['xa', 'xb']);
    expect(host.states().sort()).toEqual(['ga', 'gb']);

  });

});





describe('compareVersions deep prerelease branches', () => {

  test('numeric main parts of different lengths compare as if zero-padded', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30 }), fc.integer({ min: 0, max: 30 }),
        (a, b) => {
          expect(jssm.compareVersions(`${a}.${b}`, `${a}.${b}.0`)).toBe(0);
          expect(Math.sign(jssm.compareVersions(`${a}.${b}`, `${a}.${b}.1`))).toBe(-1);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('shorter prerelease identifier sets precede longer ones with the same prefix', () => {

    fc.assert(
      fc.property(
        fc.constantFrom('alpha', 'beta', 'rc'),
        fc.integer({ min: 0, max: 20 }),
        (tag, n) => {
          expect(jssm.compareVersions(`1.0.0-${tag}`, `1.0.0-${tag}.${n}`)).toBeLessThan(0);
          expect(jssm.compareVersions(`1.0.0-${tag}.${n}`, `1.0.0-${tag}`)).toBeGreaterThan(0);
        }
      ),
      { numRuns: RUNS }
    );

  });

  test('alphanumeric prerelease identifiers order lexically; numerics sort below them from either side', () => {

    expect(jssm.compareVersions('1.0.0-alpha', '1.0.0-beta')).toBeLessThan(0);
    expect(jssm.compareVersions('1.0.0-beta', '1.0.0-alpha')).toBeGreaterThan(0);
    expect(jssm.compareVersions('1.0.0-alpha', '1.0.0-11')).toBeGreaterThan(0);
    expect(jssm.compareVersions('1.0.0-11', '1.0.0-alpha')).toBeLessThan(0);

  });

});





describe('deserialize with history', () => {

  test('a walked machine with a history buffer restores its history through the round-trip', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 12 }),
        (capacity, steps) => {

          const fsl     = 'da -> db;  db -> da;';
          const machine = jssm.from(fsl, { history: capacity });

          for (let s = 0; s < steps; ++s) {
            expect(machine.transition(s % 2 === 0 ? 'db' : 'da')).toBe(true);
          }

          const restored = jssm.deserialize(fsl, machine.serialize());

          expect(restored.state()).toBe(machine.state());
          expect(restored.history).toEqual(machine.history);
          expect(restored.history_length).toBe(capacity);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('the string interner', () => {

  test('intern / id_of / name_of / size stay mutually consistent over random name sets', () => {

    fc.assert(
      fc.property(
        fc.uniqueArray(word, { minLength: 1, maxLength: 12 }),
        (names) => {

          const interner = new Interner();

          const ids = names.map( n => interner.intern(n) );

          // ids are dense and stable; both lookups invert each other
          names.forEach( (n, i) => {
            expect(interner.intern(n)).toBe(ids[i]);      // idempotent
            expect(interner.id_of(n)).toBe(ids[i]);
            expect(interner.name_of(ids[i])).toBe(n);
          });

          expect(interner.size).toBe(names.length);
          expect(interner.id_of('never_interned_zz')).toBe(undefined);
          expect(interner.name_of(names.length + 10)).toBe(undefined);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('pair_key is injective over constructed natural pairs', () => {

    fc.assert(
      fc.property(
        fc.tuple(fc.nat(200), fc.nat(200)),
        fc.tuple(fc.nat(200), fc.nat(200)),
        ([a1, b1], [a2, b2]) => {

          const same_pair = (a1 === a2) && (b1 === b2);
          expect(pair_key(a1, b1) === pair_key(a2, b2)).toBe(same_pair);

        }
      ),
      { numRuns: 200 }
    );

  });

});
