
import { sm, from as sm_from } from '../jssm';





describe('after mapping lifecycle', () => {

  test('by machine', () => {

    const m = sm`a after 1 -> b;`;
    expect(m.current_state_timeout()).not.toBe(undefined);

    m.clear_state_timeout();
    expect(m.current_state_timeout()).toBe(undefined);

    m.set_state_timeout('b', 1000);
    expect(m.current_state_timeout()).not.toBe(undefined);

    m.clear_state_timeout();
    expect(m.current_state_timeout()).toBe(undefined);

  });

  test('by api', () => {

    const m = sm`a -> b;`;
    expect(m.current_state_timeout()).toBe(undefined);

    m.set_state_timeout('b', 1000);
    expect(m.current_state_timeout()).not.toBe(undefined);

    m.clear_state_timeout();
    expect(m.current_state_timeout()).toBe(undefined);

    m.set_state_timeout('b', 1000);
    expect(m.current_state_timeout()).not.toBe(undefined);

    m.clear_state_timeout();
    expect(m.current_state_timeout()).toBe(undefined);

  });

});





test('custom timeout sources', () => {

  // jssm's config types a timer handle as `number` (browser-shaped), but node's
  // `setTimeout` hands back a `NodeJS.Timeout`.  The library's own default
  // timeout source resolves that same mismatch the same way — see
  // DEFAULT_TIMEOUT_SOURCE in src/ts/jssm.ts — so this shim mirrors it, keeping
  // the real handle (which is what `clearTimeout` here is handed) intact.
  const timeout_source       = (f: () => void, a: number): number => setTimeout(f, a) as unknown as number,
        clear_timeout_source = (h: number): void => clearTimeout(h);

  const m = sm_from(`a after 20s -> b;`, { timeout_source, clear_timeout_source });
  expect(m.current_state_timeout()).toStrictEqual(['b', 20_000]);

  m.clear_state_timeout();
  expect(m.current_state_timeout()).toBe(undefined)

  m.set_state_timeout('b', 1000);
  expect(m.current_state_timeout()).toStrictEqual(['b', 1000]);

  m.clear_state_timeout();

});





// `timeout_source` used to be declared `(Function, number) => number`, in which
// `Function` and `number` are *parameter names*, not types — so both parameters
// were silently `any` and the config accepted any two-argument function at all.
// The @ts-expect-error below is the regression guard: it only holds while the
// parameters are genuinely typed, and turns into an error the moment they decay
// back to `any`.

test('a mis-shaped timeout source is rejected by the type', () => {

  const clear_timeout_source = (h: number): void => clearTimeout(h);

  const m = sm_from(`a after 20s -> b;`, {
    // @ts-expect-error timeout_source takes (fn: () => void, delay_ms: number); a string delay is not a delay
    timeout_source: (_f: () => void, _delay: string): number => 0,
    clear_timeout_source
  });

  expect(m.state()).toBe('a');

});





const delay = (time: number = 1000) =>

  new Promise( resolve => setTimeout(resolve, time) );





test('timeout chains', async () => {

  let hit_b = false,
      hit_c = false,
      hit_d = false;

  const m = sm_from(`a after 200ms -> b after 10ms -> c after 10ms -> d;`);
  m.hook_entry('b', () => hit_b = true);
  m.hook_entry('c', () => hit_c = true);
  m.hook_entry('d', () => hit_d = true);

  expect(hit_b).toBe(false);
  expect(hit_c).toBe(false);
  expect(hit_d).toBe(false);

  await delay(600);

  expect(hit_b).toBe(true);
  expect(hit_c).toBe(true);
  expect(hit_d).toBe(true);

});





describe('after mapping runs normally with very short time', () => {

  describe('by machine', () => {

    test('2 milliseconds', async () => {
      const m = sm`a after 2ms -> b;`;
      await delay(100);
      expect(m.state()).toBe('b');
    });

    test('5 milliseconds', async () => {
      const m = sm`a after 5ms -> b;`;
      await delay(100);
      expect(m.state()).toBe('b');
    });

    test('10 milliseconds', async () => {
      const m = sm`a after 10ms -> b;`;
      await delay(100);
      expect(m.state()).toBe('b');
    });

    test('25 milliseconds', async () => {
      const m = sm`a after 25ms -> b;`;
      await delay(100);
      expect(m.state()).toBe('b');
    });

  });

  describe('by api', () => {

    test('2 milliseconds', async () => {
      const m = sm`a -> b;`;
      m.set_state_timeout('b', 2);
      await delay(100);
      expect(m.state()).toBe('b');
    });

    test('5 milliseconds', async () => {
      const m = sm`a -> b;`;
      m.set_state_timeout('b', 5);
      await delay(100);
      expect(m.state()).toBe('b');
    });

    test('10 milliseconds', async () => {
      const m = sm`a -> b;`;
      m.set_state_timeout('b', 10);
      await delay(100);
      expect(m.state()).toBe('b');
    });

    test('25 milliseconds', async () => {
      const m = sm`a -> b;`;
      m.set_state_timeout('b', 25);
      await delay(100);
      expect(m.state()).toBe('b');
    });

  });

});





describe('after mapping general topics', () => {

  // Note: these were previously orphan `describe()` blocks with no inner
  // `test()`.  Under jest the `expect` calls in their bodies fired at
  // collection time and were attributed to the enclosing suite.  Under vitest
  // a `describe` with no `test` is reported as `No test found in suite`.
  // Wrap as `test()` so the assertions run inside a real test.

  test('If you set an after in the machine, clear it in the api, leave, and return, it is set anew', () => {

    const m = sm`a after 1000 -> b -> c -> a;`;
    expect(m.current_state_timeout()).not.toBe(undefined);

    m.clear_state_timeout();
    expect(m.current_state_timeout()).toBe(undefined);

    m.go('b');
    m.go('c');
    m.go('a');

    expect(m.current_state_timeout()).not.toBe(undefined);

    m.clear_state_timeout();

  });


  test('If you set an after in the machine, and clear it in the api, looking up that state should give a mapping but current should not', () => {

    const m = sm`a after 1000 -> b;`;
    expect(m.current_state_timeout()).not.toBe(undefined);
    expect(m.state_timeout_for('a')).not.toBe(undefined);

    m.clear_state_timeout();
    expect(m.current_state_timeout()).toBe(undefined);
    expect(m.state_timeout_for('a')).not.toBe(undefined);

  });


  describe('cannot set a state timeout when one already exists', () => {

    test('due to machine', () => {
      const m = sm`a after 1 -> b;`;
      expect( () => m.set_state_timeout('b', 10) ).toThrow();
      m.clear_state_timeout();
    });

    test('due to api', () => {
      const m = sm`a -> b;`;
      m.set_state_timeout('b', 10);
      expect( () => m.set_state_timeout('b', 10) ).toThrow();
      m.clear_state_timeout();
    });

  });

});





function simple_test_factory(description: string, machine_string: string) {

  return test(
    `setting a ${description} doesn't throw`, () => {
      expect( () => {
        const m = sm`a after 1 -> b;`;
        m.clear_state_timeout();
      })
        .not.toThrow();
    }
  );


}





describe('after mapping particulars', () => {



  describe('without time unit', () => {
    simple_test_factory("1 delay unitless mapping (implies seconds)",   `a after 1 -> b;`);
    simple_test_factory("0 delay unitless mapping (implies seconds)",   `a after 0 -> b;`);
    simple_test_factory("1.5 delay unitless mapping (implies seconds)", `a after 1.5 -> b;`);
  });



  describe('milliseconds', () => {

    describe('basics', () => {
      simple_test_factory("1ms delay mapping",   `a after 1ms -> b;`);
      simple_test_factory("0ms delay mapping",   `a after 0ms -> b;`);
      simple_test_factory("1.5ms delay mapping", `a after 1.5ms -> b;`);
    });

    describe('units without space', () => {
      simple_test_factory("1ms delay mapping",           'a after 1ms -> b;');
      simple_test_factory("1msec delay mapping",         'a after 1msec -> b;');
      simple_test_factory("1msecs delay mapping",        'a after 1msecs -> b;');
      simple_test_factory("1millisecond delay mapping",  'a after 1millisecond -> b;');
      simple_test_factory("1milliseconds delay mapping", 'a after 1milliseconds -> b;');
    });

    describe('units with space', () => {
      simple_test_factory("1 ms delay mapping",           'a after 1 ms -> b;');
      simple_test_factory("1 msec delay mapping",         'a after 1 msec -> b;');
      simple_test_factory("1 msecs delay mapping",        'a after 1 msecs -> b;');
      simple_test_factory("1 millisecond delay mapping",  'a after 1 millisecond -> b;');
      simple_test_factory("1 milliseconds delay mapping", 'a after 1 milliseconds -> b;');
    });

  });



  describe('seconds', () => {

    describe('basics', () => {
      simple_test_factory("1s delay mapping",   `a after 1s -> b;`);
      simple_test_factory("0s delay mapping",   `a after 0s -> b;`);
      simple_test_factory("1.5s delay mapping", `a after 1.5s -> b;`);
    });

    describe('units without space', () => {
      simple_test_factory("1s delay mapping",       'a after 1s -> b;');
      simple_test_factory("1sec delay mapping",     'a after 1sec -> b;');
      simple_test_factory("1secs delay mapping",    'a after 1secs -> b;');
      simple_test_factory("1second delay mapping",  'a after 1second -> b;');
      simple_test_factory("1seconds delay mapping", 'a after 1seconds -> b;');
    });

    describe('units with space', () => {
      simple_test_factory("1 s delay mapping",       'a after 1 s -> b;');
      simple_test_factory("1 sec delay mapping",     'a after 1 sec -> b;');
      simple_test_factory("1 secs delay mapping",    'a after 1 secs -> b;');
      simple_test_factory("1 second delay mapping",  'a after 1 second -> b;');
      simple_test_factory("1 seconds delay mapping", 'a after 1 seconds -> b;');
    });

  });



  describe('minutes', () => {

    describe('basics', () => {
      simple_test_factory("1m delay mapping",   `a after 1m -> b;`);
      simple_test_factory("0m delay mapping",   `a after 0m -> b;`);
      simple_test_factory("1.5m delay mapping", `a after 1.5m -> b;`);
    });

    describe('units without space', () => {
      simple_test_factory("1m delay mapping",       'a after 1m -> b;');
      simple_test_factory("1min delay mapping",     'a after 1min -> b;');
      simple_test_factory("1mins delay mapping",    'a after 1mins -> b;');
      simple_test_factory("1minute delay mapping",  'a after 1minute -> b;');
      simple_test_factory("1minutes delay mapping", 'a after 1minutes -> b;');
    });

    describe('units with space', () => {
      simple_test_factory("1 m delay mapping",       'a after 1 m -> b;');
      simple_test_factory("1 min delay mapping",     'a after 1 min -> b;');
      simple_test_factory("1 mins delay mapping",    'a after 1 mins -> b;');
      simple_test_factory("1 minute delay mapping",  'a after 1 minute -> b;');
      simple_test_factory("1 minutes delay mapping", 'a after 1 minutes -> b;');
    });

  });



  describe('hours', () => {

    describe('basics', () => {
      simple_test_factory("1h delay mapping",   `a after 1h -> b;`);
      simple_test_factory("0h delay mapping",   `a after 0h -> b;`);
      simple_test_factory("1.5h delay mapping", `a after 1.5h -> b;`);
    });

    describe('units without space', () => {
      simple_test_factory("1h delay mapping",     'a after 1h -> b;');
      simple_test_factory("1hr delay mapping",    'a after 1hr -> b;');
      simple_test_factory("1hrs delay mapping",   'a after 1hrs -> b;');
      simple_test_factory("1hour delay mapping",  'a after 1hour -> b;');
      simple_test_factory("1hours delay mapping", 'a after 1hours -> b;');
    });

    describe('units with space', () => {
      simple_test_factory("1 h delay mapping",     'a after 1 h -> b;');
      simple_test_factory("1 hr delay mapping",    'a after 1 hr -> b;');
      simple_test_factory("1 hrs delay mapping",   'a after 1 hrs -> b;');
      simple_test_factory("1 hour delay mapping",  'a after 1 hour -> b;');
      simple_test_factory("1 hours delay mapping", 'a after 1 hours -> b;');
    });

  });



  describe('days', () => {

    describe('basics', () => {
      simple_test_factory("1d delay mapping",   `a after 1d -> b;`);
      simple_test_factory("0d delay mapping",   `a after 0d -> b;`);
      simple_test_factory("1.5d delay mapping", `a after 1.5d -> b;`);
    });

    describe('units without space', () => {
      simple_test_factory("1d delay mapping",    'a after 1d -> b;');
      simple_test_factory("1day delay mapping",  'a after 1day -> b;');
      simple_test_factory("1days delay mapping", 'a after 1days -> b;');
    });

    describe('units with space', () => {
      simple_test_factory("1 d delay mapping",    'a after 1 d -> b;');
      simple_test_factory("1 day delay mapping",  'a after 1 day -> b;');
      simple_test_factory("1 days delay mapping", 'a after 1 days -> b;');
    });

  });



  describe('weeks', () => {

    describe('basics', () => {
      simple_test_factory("1w delay mapping",   `a after 1w -> b;`);
      simple_test_factory("0w delay mapping",   `a after 0w -> b;`);
      simple_test_factory("1.5w delay mapping", `a after 1.5w -> b;`);
    });

    describe('units without space', () => {
      simple_test_factory("1w delay mapping",     'a after 1w -> b;');
      simple_test_factory("1wk delay mapping",    'a after 1wk -> b;');
      simple_test_factory("1wks delay mapping",   'a after 1wks -> b;');
      simple_test_factory("1week delay mapping",  'a after 1week -> b;');
      simple_test_factory("1weeks delay mapping", 'a after 1weeks -> b;');
    });

    describe('units with space', () => {
      simple_test_factory("1 w delay mapping",     'a after 1 w -> b;');
      simple_test_factory("1 wk delay mapping",    'a after 1 wk -> b;');
      simple_test_factory("1 wks delay mapping",   'a after 1 wks -> b;');
      simple_test_factory("1 week delay mapping",  'a after 1 week -> b;');
      simple_test_factory("1 weeks delay mapping", 'a after 1 weeks -> b;');
    });

  });



});





// The source state's `after` timer must survive a vetoed transition: the machine
// stays put, so its pending auto-advance must too.  Previously the timer was
// cleared before the hook chain ran, so a veto killed it and the state could
// never time out.  StoneCypher/fsl#1945
describe('a vetoed transition preserves the source state\'s after timer', () => {

  test('the a->b after timer survives a vetoed a->c transition', () => {
    const scheduled: number[] = [];
    const cleared: number[]   = [];
    const timeout_source       = (_f: () => void, a: number): number => { scheduled.push(a); return scheduled.length; };
    const clear_timeout_source = (h: number): void => { cleared.push(h); };

    const m = sm_from(`a after 20s -> b;\na -> c;`, { timeout_source, clear_timeout_source });
    expect(m.current_state_timeout()).toStrictEqual(['b', 20_000]);   // armed at construct

    m.hook('a', 'c', () => false);            // veto the a->c edge
    expect(m.transition('c')).toBe(false);     // valid edge, but vetoed
    expect(m.state()).toBe('a');               // still in a

    expect(m.current_state_timeout()).toStrictEqual(['b', 20_000]);   // timer preserved
    expect(cleared).toStrictEqual([]);         // nothing was cleared by the veto
  });

  test('a successful transition still clears the departed timer (fsl#1327 preserved)', () => {
    const cleared: number[] = [];
    const timeout_source       = (_f: () => void, _a: number): number => 1;
    const clear_timeout_source = (h: number): void => { cleared.push(h); };

    const m = sm_from(`a after 20s -> b;\na -> c;`, { timeout_source, clear_timeout_source });
    expect(m.current_state_timeout()).toStrictEqual(['b', 20_000]);

    expect(m.transition('c')).toBe(true);      // manual transition away, no hook
    expect(m.state()).toBe('c');
    expect(cleared).toStrictEqual([1]);        // the a->b ghost timer was cleared on commit
    expect(m.current_state_timeout()).toBe(undefined);   // c has no after
  });

});
