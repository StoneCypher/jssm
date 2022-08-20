
import { FlowDirections }    from './constants.spec';
import { sm, FslDirections } from '../jssm';





describe('Flow directions', () => {

  FlowDirections.map( thisDir =>
    test(`Direction "${thisDir}" parses as a flow direction`, () =>
      expect( () => { const _foo = sm`flow: ${thisDir}; a-> b;`; }).not.toThrow() ) );

  FlowDirections.map( thisDir =>
    test(`Direction "${thisDir}" parses correctly`, () =>
      expect( sm`flow: ${thisDir}; a-> b;`.flow() ).toBe(thisDir) ) );

  test('Fake flow direction throws', () =>
    expect( () => { const _foo = sm`flow: yourFlowIsWhackSon; a-> b;`; } ).toThrow() );

  test('FslDirections', () => {

    const foo  = sm`a->b;`,
          dirs = FslDirections;

    expect( Array.isArray(FslDirections) ).toBe(true);
    expect( typeof FslDirections[0] ).toBe('string');

  });

});
