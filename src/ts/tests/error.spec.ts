
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


  test('Creating an error from the class makes a JssmError', () => {

    expect( () => {
      try {
        const _foo = sm`a -FAIL> b;`;
      } catch (e) {
        expect(e instanceof JssmError).toBe(true);
      }
    })

  } );


  test('Creating an error from the machine makes a JssmError', () => {

    expect( () => {
      try {
        const foo = jssm.from('a->b;');
        foo.state_for('c');
      } catch (e) {
        expect(e instanceof JssmError).toBe(true);
      }
    })

  } );


  test('Creating an error directly from the class has the complex message as its emit', () => {

// TODO

    expect( () => { const _foo = sm`a -FAIL> b;`; } )
      .toThrow( 'Expected \"{\", action label, arrow, nonneg number, or whitespace but \"-\" found.' )

  } );


  test('Creating an error from the machine has the complex message as its emit', () => {

// TODO

    expect( () => {
      const _foo = sm`a -> b;`;
      _foo.state_for('c');
    } )
      .toThrow( 'No such state (at "a", requested "c")' )

  } );


  test('Creating an error from the machine has the complex message as its emit', () => {

    expect( () => {
      const _foo = jssm.from(`a -> b;`, { instance_name: 'doug' });
      _foo.state_for('c');
    } )
      .toThrow( '[[doug]]: No such state (at "a", requested "c")' )

  } );


  test('Machine errors drop the parenthetical without content', () => {

    expect( () => { jssm.arrow_direction('-a>' as any); } )
      .toThrow( 'arrow_direction: unknown arrow type -a>' )

  } );


  test('Creating an error has undefined for a state when appropriate', () => {

    expect( () => {
      try {
        const _foo = sm`a -FAIL> b;`;
      } catch (e) {
        expect(e.state).toBe(undefined)
      }
    })

  } );

});
