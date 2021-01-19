
import * as jssm from '../jssm';

const sm   = jssm.sm,
      jp   = jssm.parse;





describe('simple naming', () => {



  describe('parse', () => {

    test('trans then node', () =>
      expect(() => {
        jp('a -> b; state a: { color: orange; };');
      }).not.toThrow() );

    test('node then trans', () =>
      expect(() => {
        jp('state a: { color: orange; }; a -> b;');
      }).not.toThrow() );

    test('cycle node named', () =>
      expect(() => {
        jp('[a b] -> +1; state a: { color: red; }; &b: [a c e];');
      }).not.toThrow() );

    test('two properties', () =>
      expect(() => {
        jp('a -> b; state a: { color: orange; shape: circle; };');
      }).not.toThrow() );

  });



  describe('sm tag', () => {

    test('trans then node', () =>
      expect(() => {
        sm`a -> b; state a: { color: orange; };`;
      }).not.toThrow() );

    test('node then trans', () =>
      expect(() => {
        sm`state a: { color: orange; }; a -> b;`;
    }).not.toThrow() );

    test.todo('Uncomment when named nodes work');

//  test('cycle node named', () =>
//    expect(() => {
//      sm`[a b] -> +1; state a: { color: red; }; &b: [a c e];`;
//    }).not.toThrow() );

    test('two properties', () =>
      expect(() => {
        sm`a -> b; state a: { color: orange; shape: circle; };`;
      }).not.toThrow() );

  });

});





describe('spacing variants', () => {

  test('tight', () =>
    expect(() => {
      jp('a -> b; state a:{color:orange;};');
    }).not.toThrow() );

  test('framed', () =>
    expect(() => {
      jp('a -> b; state a:{ color:orange; };');
    }).not.toThrow() );

  test('sentence', () =>
    expect(() => {
      jp('a -> b; state a:{ color: orange; };');
    }).not.toThrow() );

  test('fully', () =>
    expect(() => {
      jp('a -> b; state a:{ color : orange; };');
    }).not.toThrow() );

  test('mars', () =>
    expect(() => {
      jp('a -> b; state a:{color : orange;};');
    }).not.toThrow() );

});





describe('properties', () => {

  test('color', () =>

    expect(
     sm`a -> b; state a:{color:orange;};`.raw_state_declarations()[0]
    ).toEqual(
      {state:'a', color:'#ffa500ff', declarations:[{key: "color", value: "#ffa500ff"}]}
    )

  );

});





test.todo('More to do in nominated states');





// TODO FIXME TESTME test state_delarations/0
// TODO FIXME TESTME test state_delaration/1 for has
// TODO FIXME TESTME test state_delaration/1 for doesn't have
// TODO FIXME TESTME test that redeclaring a state throws
