
import * as jssm from '../jssm';





test('go (synonym of transition)', () => {

  const machine = jssm.sm`a -> b;`,
        result  = machine.go('b');

  expect( result ).toBe( true );
  expect( machine.state() ).toBe('b');

});





test('do (synonym of action)', () => {

  const machine = jssm.sm`a 'next' -> b;`,
        result  = machine.do('next');

  expect( result ).toBe( true );
  expect( machine.state() ).toBe('b');

});
