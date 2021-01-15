
const jssm = require('../jssm');





describe('named lists', () => {

  test('alone', () =>
    expect(() => { jssm.parse('&b: [a c e];'); }).not.toThrow() );

  test('before trans', () =>
    expect(() => { jssm.parse('&b: [a c e]; a->c;'); }).not.toThrow() );

  test('after trans', () =>
    expect(() => { jssm.parse('a->c; &b: [a c e];'); }).not.toThrow() );

});
