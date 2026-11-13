
 

import { sm } from '../jssm';





describe('graph attributes don\'t throw', () => {

  const machine = sm`graph_layout: circo; a->b->c->d->e->f->a;`;

  test('layout is circo', () => expect(machine.graph_layout()).toBe('circo') );
  test('graph_layout names only Graphviz engines, so tonal is rejected there (it is a graph_renderer)', () =>
    expect(() => sm`graph_layout: tonal; a -> b;`).toThrow() );
  test('an unknown graph_layout value is still rejected', () =>
    expect(() => sm`graph_layout: tonalish; a -> b;`).toThrow() );

});





describe('error catchery', () => {

  test('double graph_layout throws', () =>
    expect( () => {
      const _machine = sm`graph_layout: circo; graph_layout: circo; a->b->c->d->e->f->a;`;
    } ).toThrow() );

});
