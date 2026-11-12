
 

import { sm } from '../jssm';





describe('graph attributes don\'t throw', () => {

  const machine = sm`graph_layout: circo; a->b->c->d->e->f->a;`;

  test('layout is circo', () => expect(machine.graph_layout()).toBe('circo') );
  test('layout is tonal', () => expect(sm`graph_layout: tonal; a -> b;`.graph_layout()).toBe('tonal') );
  test('tonal is reserved only as a graph_layout value, so a state may still be named tonal', () => {
    const named = sm`graph_layout: tonal; tonal 'go' -> b; b -> tonal;`;
    expect(named.states()).toEqual(['tonal', 'b']);
    expect(named.graph_layout()).toBe('tonal');
  });
  test('an unknown graph_layout value is still rejected', () =>
    expect(() => sm`graph_layout: tonalish; a -> b;`).toThrow() );

});





describe('error catchery', () => {

  test('double graph_layout throws', () =>
    expect( () => {
      const _machine = sm`graph_layout: circo; graph_layout: circo; a->b->c->d->e->f->a;`;
    } ).toThrow() );

});
