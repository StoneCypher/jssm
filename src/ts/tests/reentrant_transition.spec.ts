
import { from } from '../jssm';

// A hook fires inside transition_impl's pre-commit pipeline, before the outer
// transition has committed.  If a hook itself transitions the machine, the
// inner transition would be silently overwritten by the outer commit -- wrong
// final state, observation events fired for a state not ended in.  The machine
// now rejects such reentry with a clear error, and the pre-commit guard resets
// on every exit path (throw, veto, or a hook that itself throws) so the machine
// stays usable.  StoneCypher/fsl#1953

describe('reentrant transition from within a hook (StoneCypher/fsl#1953)', () => {

  test('a named-edge hook that calls go() throws instead of silently reverting', () => {
    const m = from('a -> b; a -> c;', {});
    m.hook('a', 'b', () => { m.go('c'); return true; });

    expect( () => m.transition('b') ).toThrow(/within a transition hook/);
    expect( m.state() ).toBe('a');                 // the outer transition never committed
  });

  test('the guard resets after a rejected reentry, leaving the machine usable', () => {
    const m = from('a -> b; a -> c;', {});
    m.hook('a', 'b', () => { m.go('c'); return true; });

    expect( () => m.transition('b') ).toThrow();
    // The pre-commit window was closed by the finally, so a later, non-reentrant
    // transition still succeeds instead of spuriously throwing.
    expect( m.transition('c') ).toBe(true);
    expect( m.state() ).toBe('c');
  });

  test('a vetoing hook (returns false) leaves the guard clear', () => {
    const m = from('a -> b; a -> c;', {});
    m.hook('a', 'b', () => false);

    expect( m.transition('b') ).toBe(false);       // vetoed, not thrown
    expect( m.state() ).toBe('a');
    expect( m.transition('c') ).toBe(true);        // rejection path cleared the guard
    expect( m.state() ).toBe('c');
  });

  test('a hook that itself throws leaves the guard clear', () => {
    const m = from('a -> b; a -> c;', {});
    m.hook('a', 'b', () => { throw new Error('boom'); });

    expect( () => m.transition('b') ).toThrow('boom');
    expect( m.state() ).toBe('a');
    expect( m.transition('c') ).toBe(true);        // finally cleared the guard despite the throw
    expect( m.state() ).toBe('c');
  });

  test('an ordinary hooked transition (no reentry) still commits normally', () => {
    const m = from('a -> b; a -> c;', {});
    let fired = false;
    m.hook('a', 'b', () => { fired = true; return true; });

    expect( m.transition('b') ).toBe(true);
    expect( fired ).toBe(true);
    expect( m.state() ).toBe('b');
  });

});
