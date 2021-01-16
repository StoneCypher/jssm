
const jssm = require('../jssm'),
      sm   = jssm.sm;





describe('Arrange', () => {



  test('Single arrange', () => {

    expect( () => { const _foo = sm`arrange [a b]; a -> b;`; })
      .not.toThrow();

    expect(
      sm`arrange [a b]; a -> b;`._arrange_declaration
    ).toEqual(
      [['a','b']]
    );

  });



  test('Multiple arrange', () => {

    expect( () => { const _foo = sm`arrange [a b]; a -> b; c -> d; arrange [c d];`; })
      .not.toThrow();

    expect(
      sm`arrange [a b]; a -> b; c -> d; arrange [c d];`._arrange_declaration
    ).toEqual(
      [['a','b'],['c','d']]
    );

  });



  test('start', () => {

    expect( () => { const _foo = sm`arrange-start [a c]; a -> b -> c -> d;`; })
      .not.toThrow();

    expect(
      sm`arrange-start [a c]; a -> b -> c -> d;`._arrange_start_declaration
    ).toEqual(
      [['a','c']]
    );

  });



  test('end', () => {

    expect( () => { const _foo = sm`arrange-end [a c]; a -> b -> c -> d;`; })
      .not.toThrow();

    expect(
      sm`arrange-end [b d]; a -> b -> c -> d;`._arrange_end_declaration
    ).toEqual(
      [['b','d']]
    );

  });



});
