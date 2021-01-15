
/* eslint-disable max-len */

const jssm = require('../jssm'),
      sm   = jssm.sm;





describe('graph node lists', () => {

  test('start states don\'t throw', () => expect( () => { const _a = sm`start_states: [a b c]; a->b->c->d;`; }).not.toThrow() );
  test('end states don\'t throw',   () => expect( () => { const _a = sm`end_states:   [a b c]; a->b->c->d;`; }).not.toThrow() );

  test.todo('start node overrides');

// comeback whargarbl
//  const overrider = make(` a->b->c; start_nodes: [c]; `);
//  it('start nodes override initial node', t => t.is(0, () => {}) );

});
