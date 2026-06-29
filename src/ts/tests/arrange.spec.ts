
import { sm } from '../jssm';





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



  test('Cannot arrange a node that does not exist', () => {

    expect( () => { const _foo = sm`a -> b; arrange[a c];`; })
      .toThrow();

  });



  test('Single oarrange', () => {

    expect( () => { const _foo = sm`oarrange [a b]; a -> b;`; })
      .not.toThrow();

    expect(
      sm`oarrange [a b]; a -> b;`._oarrange_declaration
    ).toEqual(
      [['a','b']]
    );

  });



  test('Multiple oarrange', () => {

    expect(
      sm`oarrange [a b]; a -> b; c -> d; oarrange [c d];`._oarrange_declaration
    ).toEqual(
      [['a','b'],['c','d']]
    );

  });



  test('Single farrange', () => {

    expect( () => { const _foo = sm`farrange [a b]; a -> b;`; })
      .not.toThrow();

    expect(
      sm`farrange [a b]; a -> b;`._farrange_declaration
    ).toEqual(
      [['a','b']]
    );

  });



  test('Cannot oarrange a node that does not exist', () => {

    expect( () => { const _foo = sm`a -> b; oarrange[a c];`; })
      .toThrow();

  });



  test('Cannot farrange a node that does not exist', () => {

    expect( () => { const _foo = sm`a -> b; farrange[a c];`; })
      .toThrow();

  });



});
