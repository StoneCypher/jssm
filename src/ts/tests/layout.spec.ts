
/* eslint-disable max-len */

const jssm = require('../jssm'),
      sm   = jssm.sm;





describe('graph attributes don\'t throw', () => {

  const machine = sm`graph_layout: circo; a->b->c->d->e->f->a;`;

  test('layout is circo', () => expect(machine.graph_layout()).toBe('circo') );

});





describe('error catchery', () => {

  test('double graph_layout throws', () =>
    expect( () => {
      const _machine = sm`graph_layout: circo; graph_layout: circo; a->b->c->d->e->f->a;`;
    } ).toThrow() );

});
