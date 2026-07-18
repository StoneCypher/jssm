
import * as jssm     from '../jssm';
import { JssmError } from '../jssm_error';

const sm = jssm.sm;





describe('Basic hooks on API callpoint', () => {


  test('Creating an error should throw', () => {

    expect( () => {
      const _foo = sm`a -FAIL> b;`;
    })
      .toThrow();

  } );


  // NOTE: this test's original title claimed the parse failure "makes a
  // JssmError", but its expect() was never invoked (a bare `expect(fn)` with
  // no matcher), so nothing was ever verified.  In reality wrap_parse
  // propagates the PEG parser's raw SyntaxError — see the "complex message"
  // test below, which pins that raw message as the contract.  If parse
  // errors are ever wrapped in JssmError, strengthen this to instanceof
  // JssmError.
  test('Creating an error from the class throws a real Error', () => {

    let caught: unknown;
    try { const _foo = sm`a -FAIL> b;`; } catch (error) { caught = error; }
    expect(caught instanceof Error).toBe(true);

  } );


  test('Creating an error from the machine makes a JssmError', () => {

    let caught: unknown;
    try {
      const foo = jssm.from('a->b;');
      foo.state_for('c');
    } catch (error) { caught = error; }
    expect(caught instanceof JssmError).toBe(true);

  } );


  test('Creating an error directly from the class has the complex message as its emit', () => {

// TODO

    expect( () => { const _foo = sm`a -FAIL> b;`; } )
      .toThrow( 'Expected "after", "{", action label, arrow, nonneg number, or whitespace but "-" found.' )

  } );


  test('Creating an error from the machine has the complex message as its emit', () => {

// TODO

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.state_for('c');
    } )
      .toThrow( 'No such state (at "a", requested "c")' )

  } );


  test('Creating an error from a named instance prefixes the instance name onto its emit', () => {

    expect( () => {
      const _foo = jssm.from(`a -> b;`, { instance_name: 'doug' });
      _foo.state_for('c');
    } )
      .toThrow( '[[doug]]: No such state (at "a", requested "c")' )

  } );


  test('re-declaring the same transition throws "already has" (#673)', () => {

    expect( () => { const _m = sm`a -> b; a -> b;`; } )
      .toThrow( /already has/ );

  } );


  test('the duplicate-edge error is a JssmError (#673)', () => {

    let caught: unknown;
    try { const _m = sm`a -> b; a -> b;`; } catch (error) { caught = error; }
    expect(caught instanceof JssmError).toBe(true);

  } );


  test('Machine errors drop the parenthetical without content', () => {

    expect( () => { jssm.arrow_direction('-a>' as any); } )
      .toThrow( 'arrow_direction: unknown arrow type -a>' )

  } );


  // NOTE: this test used to read `(caught as JssmError).state`, which is not a
  // field JssmError has ever had; the assertion `.toBe(undefined)` therefore
  // could not fail no matter what the library did.  The real field is
  // `requested_state`, and it is exercised here in both directions so that the
  // `undefined` case cannot pass vacuously.
  test('A JssmError has undefined for requested_state when no state was requested', () => {

    // A duplicate-edge error is raised with no requested state ...
    let unrequested: unknown;
    try { const _m = sm`a -> b; a -> b;`; } catch (error) { unrequested = error; }

    expect(unrequested).toBeInstanceOf(JssmError);
    expect((unrequested as JssmError).requested_state).toBe(undefined);

    // ... whereas a no-such-state error is raised with one, so an
    // always-undefined `requested_state` would fail this half.
    let requested: unknown;
    try {
      const foo = jssm.from('a->b;');
      foo.state_for('c');
    } catch (error) { requested = error; }

    expect(requested).toBeInstanceOf(JssmError);
    expect((requested as JssmError).requested_state).toBe('c');

  } );

});
