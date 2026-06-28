
import * as fc from 'fast-check';

import * as jssm from '../jssm';





// Property-based coverage for the remaining machine surfaces: state
// labels, start/end/failed-output declarations, flow and layout getters,
// and the compiler's duplicate-attribute rejections.



const RUNS = 50;



const word = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')),
  { minLength: 2, maxLength: 10 }
);





describe('state labels', () => {

  test('a declared label becomes display_text and label_for; unlabeled states fall back to their name', () => {

    fc.assert(
      fc.property(
        word,
        (label) => {

          const machine = jssm.from(`aa -> bb;  state aa: { label: "${label}"; };`);

          expect(machine.display_text('aa')).toBe(label);
          expect(machine.label_for('aa')).toBe(label);

          expect(machine.display_text('bb')).toBe('bb');
          expect(machine.label_for('bb')).toBe(undefined);

        }
      ),
      { numRuns: RUNS }
    );

  });

});





describe('start_states, end_states, failed_outputs declarations', () => {

  test('every member of start_states is a start state and a legal initial_state', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (start_count) => {

          const names  = ['q0', 'q1', 'q2', 'q3'];
          const starts = names.slice(0, start_count);
          const fsl    = `start_states: [${starts.join(' ')}];  q0 -> q1;  q1 -> q2;  q2 -> q3;  q3 -> q0;`;

          for (const init of starts) {
            const machine = jssm.from(fsl, { initial_state: init });
            expect(machine.state()).toBe(init);
            expect(machine.is_start_state(init)).toBe(true);
          }

          const non_start = names[start_count] ?? undefined;

          if (non_start !== undefined) {
            expect(jssm.from(fsl).is_start_state(non_start)).toBe(false);
            expect(() => jssm.from(fsl, { initial_state: non_start })).toThrow();
            // ...unless enforcement is waived
            const waived = jssm.from(fsl, { initial_state: non_start, start_states_no_enforce: true });
            expect(waived.state()).toBe(non_start);
          }

        }
      ),
      { numRuns: 30 }
    );

  });

  test('end_states members report is_end_state; others do not', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        (which) => {

          const names   = ['q0', 'q1', 'q2', 'q3'];
          const the_end = names[which];
          const machine = jssm.from(`end_states: [${the_end}];  q0 -> q1;  q1 -> q2;  q2 -> q3;  q3 -> q0;`);

          for (const name of names) {
            expect(machine.is_end_state(name)).toBe(name === the_end);
          }

        }
      ),
      { numRuns: 30 }
    );

  });

  test('failed_outputs members report is_failed_output; is_failed tracks the current state', () => {

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (which) => {

          const names  = ['q0', 'q1', 'q2', 'q3'];
          const failed = names[which];
          const machine = jssm.from(`failed_outputs: [${failed}];  q0 -> q1;  q1 -> q2;  q2 -> q3;  q3 -> q0;`);

          expect(machine.failed_outputs()).toEqual([failed]);

          for (const name of names) {
            expect(machine.is_failed_output(name)).toBe(name === failed);
          }

          expect(machine.is_failed()).toBe(false);   // q0 is never in the failed list here

          // walk to the failed state and confirm is_failed flips
          for (let i = 1; i <= which; ++i) {
            expect(machine.transition(names[i])).toBe(true);
          }
          expect(machine.is_failed()).toBe(true);

        }
      ),
      { numRuns: 30 }
    );

  });

});





describe('graph and rendering attribute getters', () => {

  test('flow() and graph_layout() round-trip their directives', () => {

    fc.assert(
      fc.property(
        fc.constantFrom('up', 'down', 'left', 'right'),
        fc.constantFrom('dot', 'circo', 'fdp', 'neato'),
        (flow, layout) => {

          const machine = jssm.from(`flow: ${flow};  graph_layout: ${layout};  aa -> bb;`);

          expect(machine.flow()).toBe(flow);
          expect(machine.graph_layout()).toBe(layout);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('dot_preamble() round-trips; npm_name() round-trips', () => {

    fc.assert(
      fc.property(
        word, word,
        (preamble, npm) => {

          const machine = jssm.from(`dot_preamble: "${preamble}";  npm_name: "${npm}";  aa -> bb;`);

          expect(machine.dot_preamble()).toBe(preamble);
          expect(machine.npm_name()).toBe(npm);

        }
      ),
      { numRuns: RUNS }
    );

  });

  test('character-vocabulary and theme surfaces return populated lists', () => {

    const machine = jssm.from('aa -> bb;');

    expect(machine.all_themes().length).toBeGreaterThan(0);
    expect(machine.all_themes()).toContain('default');

    for (const vocab of [
      machine.all_state_name_chars(),
      machine.all_state_name_first_chars(),
      machine.all_action_label_chars()
    ]) {
      expect(vocab.length).toBeGreaterThan(0);
      for (const range of vocab) {
        expect(typeof range.from).toBe('string');
        expect(typeof range.to).toBe('string');
        expect(range.from <= range.to).toBe(true);
      }
    }

  });

});





describe('compiler rejection of duplicate one-only attributes', () => {

  const dup_cases: Array<[string, string, string]> = [
    ['machine_name',    '"first"',  '"second"'],
    ['machine_license', 'MIT',      'BSD'     ],
    ['flow',            'down',     'up'      ],
    ['graph_layout',    'dot',      'circo'   ],
    ['dot_preamble',    '"one"',    '"two"'   ],
    ['machine_version', '1.0.0',    '2.0.0'   ],
    ['fsl_version',     '1.0.0',    '2.0.0'   ]
  ];

  test('declaring any one-only attribute twice throws at compile', () => {

    fc.assert(
      fc.property(
        fc.constantFrom(...dup_cases),
        ([key, v1, v2]) => {

          expect(() => jssm.from(`${key}: ${v1};  ${key}: ${v2};  aa -> bb;`)).toThrow();

          // and declaring it once is fine
          expect(() => jssm.from(`${key}: ${v1};  aa -> bb;`)).not.toThrow();

        }
      ),
      { numRuns: 30 }
    );

  });

});
