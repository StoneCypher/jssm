
import * as jssm from '../jssm';





describe('histograph/1', () => {

  test('([]) generates Map()', () =>
    expect( jssm.histograph([]) ).toEqual( new Map( ) ) );

  test('([1]) generates Map([[1,1]])', () =>
    expect( jssm.histograph([1]) ).toEqual( new Map( [[1,1]] ) ) );

  test('([1,2]) generates Map([[1,1],[2,1]])', () =>
    expect( jssm.histograph([1,2]) ).toEqual( new Map( [[1,1],[2,1]] ) ) );

  test('([1,1,2]) generates Map([[1,2],[2,1]])', () =>
    expect( jssm.histograph([1,1,2]) ).toEqual( new Map( [[1,2],[2,1]] ) ) );

});

// stochable
