
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



describe('val: required and supplied values', () => {

  test('a required val supplied via the vals option is accepted', () => {
    const m = jssm.from('val tier : enum(free, pro) required; a -> b;', { vals: { tier: 'pro' } });
    expect( m.val('tier') ).toBe('pro');
  });

  test('a required val with no supplied value throws', () => {
    expect( () => jssm.from('val tier : enum(free, pro) required; a -> b;') )
      .toThrow(/is required, but no value was supplied/);
  });

  test('declaring required and default together throws', () => {
    expect( () => jssm.from('val n : int default 0 required; a -> b;') )
      .toThrow(/required, but also has a default/);
  });

  test('supplying a value for an undeclared val throws', () => {
    expect( () => jssm.from('val n : int default 0; a -> b;', { vals: { nope: 1 } }) )
      .toThrow(/undeclared val "nope"/);
  });

  test('a supplied value is type-validated', () => {
    expect( () => jssm.from('val n : int 0..3 required; a -> b;', { vals: { n: 99 } }) )
      .toThrow(/above the maximum 3/);
  });

  test('a supplied value overrides the default', () => {
    const m = jssm.from('val n : int default 1; a -> b;', { vals: { n: 2 } });
    expect( m.val('n') ).toBe(2);
  });

});



describe('val: set_val mutation', () => {

  test('set_val updates the current value', () => {
    const m = jssm.from('val n : int default 0; a -> b;');
    m.set_val('n', 5);
    expect( m.val('n') ).toBe(5);
  });

  test('set_val type-validates the new value', () => {
    const m = jssm.from('val n : int 0..3 default 0; a -> b;');
    expect( () => m.set_val('n', 7) ).toThrow(/above the maximum 3/);
  });

  test('set_val on an unknown val throws', () => {
    const m = jssm.from('val n : int default 0; a -> b;');
    expect( () => m.set_val('ghost', 1) ).toThrow(/No such val "ghost"/);
  });

});



describe('val: accessors', () => {

  test('vals() returns every val and its value', () => {
    const m = jssm.from('val a : int default 1; val b : boolean default false; x -> y;');
    expect( m.vals() ).toEqual({ a: 1, b: false });
  });

  test('known_val reports declared and undeclared names', () => {
    const m = jssm.from('val a : int default 1; x -> y;');
    expect( m.known_val('a') ).toBe(true);
    expect( m.known_val('z') ).toBe(false);
  });

  test('known_vals lists declared names', () => {
    const m = jssm.from('val a : int default 1; val b : int default 2; x -> y;');
    expect( m.known_vals() ).toEqual(['a', 'b']);
  });

  test('val_type returns the declared type descriptor', () => {
    const m = jssm.from('val n : int 0..3 default 0; x -> y;');
    expect( m.val_type('n') ).toEqual({ kind: 'int', lo: 0, hi: 3 });
  });

  test('val_type on an unknown val throws', () => {
    const m = jssm.from('val n : int default 0; x -> y;');
    expect( () => m.val_type('ghost') ).toThrow(/No such val "ghost"/);
  });

});



describe('val: duplicate names', () => {

  test('redefining a val name throws', () => {
    expect( () => jssm.from('val n : int default 0; val n : int default 1; a -> b;') )
      .toThrow(/redefine val/);
  });

});



describe('val: val/property name collision (jssm#757)', () => {

  test('a val and a property sharing a name throws', () => {
    expect( () => jssm.from('val color : int default 0; property color default 1; a -> b;') )
      .toThrow(/val and a property cannot share the name/);
  });

});



describe('val: numeric-looking enum members (jssm#759)', () => {

  test('an enum member that begins with a digit throws', () => {
    expect( () => jssm.from('val tier : enum(1, 2) default 1; a -> b;') )
      .toThrow(/must not begin with a digit/);
  });

});
