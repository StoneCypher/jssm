
import * as jssm from '../jssm';





describe('seq/1', () => {

  test('(0) generates []',    () => expect( jssm.seq(0) ).toEqual( []    ) );
  test('(1) generates [0]',   () => expect( jssm.seq(1) ).toEqual( [0]   ) );
  test('(2) generates [0,1]', () => expect( jssm.seq(2) ).toEqual( [0,1] ) );

});

// stochable
