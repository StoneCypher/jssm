
import * as jssm from '../jssm';





// TODO these tests only assert non-crashing
// That amn't very good, sah

test.todo('Assert better than non-crashing in named lists.spec.ts');

describe('named lists', () => {

  test('alone', () =>
    expect(() => { jssm.parse('&b: [a c e];'); }).not.toThrow() );

  test('before trans', () =>
    expect(() => { jssm.parse('&b: [a c e]; a->c;'); }).not.toThrow() );

  test('after trans', () =>
    expect(() => { jssm.parse('a->c; &b: [a c e];'); }).not.toThrow() );

});
