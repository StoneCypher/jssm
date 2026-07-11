
 

import * as jssm from '../jssm';





// #703: compile() previously assembled its transition list with
// `[].concat(...results['transition'])`, which spreads the whole list into an
// argument list and is therefore bounded by the engine's maximum argument
// count (~65k in V8) — machines past that ceiling threw RangeError inside the
// compiler before any jssm semantics ran.  The tree is manufactured directly
// (no parsing) so the test exercises only the compile step and stays fast.
describe('compile scales past the engine argument-count ceiling (#703)', () => {

  const N = 70_000;

  test(`compiles a ${N}-transition parse tree`, () => {

    const tree = [];
    for (let i = 0; i < N; ++i) {
      tree.push({ key: 'transition', from: `s${i}`, se: { kind: '->', to: `s${i + 1}` } });
    }

    const cfg = jssm.compile(tree as Parameters<typeof jssm.compile>[0]);

    expect(cfg.transitions.length).toBe(N);
    expect(cfg.transitions[0].from).toBe('s0');
    expect(cfg.transitions[N - 1].to).toBe(`s${N}`);
    expect(cfg.start_states).toEqual(['s0']);

  });

});
