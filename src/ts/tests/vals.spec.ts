
import * as jssm from '../jssm';



describe('val: boolean declaration', () => {

  test('declares and reads a boolean val with a default', () => {
    const m = jssm.from('val ok : boolean default true; a -> b;');
    expect( m.val('ok') ).toBe(true);
  });

  test('creating a boolean val does not throw', () => {
    expect( () => jssm.from('val ok : boolean default false; a -> b;') )
      .not.toThrow();
  });

  test('a non-boolean default throws', () => {
    expect( () => jssm.from('val ok : boolean default 5; a -> b;') )
      .toThrow(/expects boolean/);
  });

});



describe('val: int declaration', () => {

  test('declares and reads an int val', () => {
    const m = jssm.from('val n : int default 7; a -> b;');
    expect( m.val('n') ).toBe(7);
  });

  test('a non-integer default throws', () => {
    expect( () => jssm.from('val n : int default 1.5; a -> b;') )
      .toThrow(/expects an integer/);
  });

  test('an int val with no default reads as undefined', () => {
    const m = jssm.from('val n : int; a -> b;');
    expect( m.val('n') ).toBeUndefined();
  });

});



describe('val: bounded int', () => {

  test('an in-range default is accepted', () => {
    const m = jssm.from('val n : int 0..3 default 2; a -> b;');
    expect( m.val('n') ).toBe(2);
  });

  test('a below-minimum default throws', () => {
    expect( () => jssm.from('val n : int 0..3 default -1; a -> b;') )
      .toThrow(/below the minimum 0/);
  });

  test('an above-maximum default throws', () => {
    expect( () => jssm.from('val n : int 0..3 default 9; a -> b;') )
      .toThrow(/above the maximum 3/);
  });

  test('negative bounds parse and validate', () => {
    const m = jssm.from('val n : int -5..-1 default -3; a -> b;');
    expect( m.val('n') ).toBe(-3);
  });

});



describe('val: string declaration', () => {

  test('declares and reads a string val', () => {
    const m = jssm.from('val note : string default "hello"; a -> b;');
    expect( m.val('note') ).toBe('hello');
  });

  test('a numeric default for a string val throws', () => {
    expect( () => jssm.from('val note : string default 5; a -> b;') )
      .toThrow(/expects string/);
  });

});



describe('val: enum declaration', () => {

  test('declares and reads an enum val', () => {
    const m = jssm.from('val tier : enum(free, pro, enterprise) default pro; a -> b;');
    expect( m.val('tier') ).toBe('pro');
  });

  test('a default outside the enum members throws', () => {
    expect( () => jssm.from('val tier : enum(free, pro) default gold; a -> b;') )
      .toThrow(/expects one of/);
  });

});



describe('val: unknown name', () => {

  test('val on an unknown name throws', () => {
    const m = jssm.from('val n : int default 0; a -> b;');
    expect( () => m.val('ghost') ).toThrow(/No such val "ghost"/);
  });

});
