
/* eslint-disable max-len */

import { sm } from '../jssm';





describe('reject and accept correctly', () => {

  const machine = sm` a ~> b -> c; `;

  test('starts in a',                    () => expect( machine.state()               ).toBe('a')   );
  test('rejects transition to b',        () => expect( machine.transition('b')       ).toBe(false) );
  test('still in a',                     () => expect( machine.state()               ).toBe('a')   );
  test('rejects transition to c',        () => expect( machine.transition('c')       ).toBe(false) );
  test('still in a 2',                   () => expect( machine.state()               ).toBe('a')   );
  test('rejects forced transition to c', () => expect( machine.force_transition('c') ).toBe(false) );
  test('still in a 3',                   () => expect( machine.state()               ).toBe('a')   );
  test('accepts forced transition to b', () => expect( machine.force_transition('b') ).toBe(true)  );
  test('now in b',                       () => expect( machine.state()               ).toBe('b')   );
  test('accepts transition to c',        () => expect( machine.transition('c')       ).toBe(true)  );
  test('now in c',                       () => expect( machine.state()               ).toBe('c')   );

});





describe('uses_forced_transitions', () => {

  test( 'standard transition', () => expect(sm`a -> b;`.uses_forced_transitions).toBe(false) );
  test( 'main transition',     () => expect(sm`a => b;`.uses_forced_transitions).toBe(false) );
  test( 'forced transition',   () => expect(sm`a ~> b;`.uses_forced_transitions).toBe(true)  );

  test( 'standard and main transition',   () => expect(sm`a -> b; c => d;`.uses_forced_transitions).toBe(false) );
  test( 'forced and main transition',     () => expect(sm`a ~> b; c => d;`.uses_forced_transitions).toBe(true)  );
  test( 'main and forced transition',     () => expect(sm`a => b; c ~> d;`.uses_forced_transitions).toBe(true)  );
  test( 'standard and forced transition', () => expect(sm`a -> b; c ~> d;`.uses_forced_transitions).toBe(true)  );

  test( 'standard and main transition, chain',   () => expect(sm`a -> c => d;`.uses_forced_transitions).toBe(false) );
  test( 'forced and main transition, chain',     () => expect(sm`a ~> c => d;`.uses_forced_transitions).toBe(true)  );
  test( 'main and forced transition, chain',     () => expect(sm`a => c ~> d;`.uses_forced_transitions).toBe(true)  );
  test( 'standard and forced transition, chain', () => expect(sm`a -> c ~> d;`.uses_forced_transitions).toBe(true)  );

});
