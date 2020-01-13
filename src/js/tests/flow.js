
import { describe }       from 'ava-spec';
import { FlowDirections } from './constants';





const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('Flow directions', async it => {

  FlowDirections.map(thisDir =>
    it(`Direction "${thisDir}" parses as a flow direction`, t =>
      t.notThrows( () => { const _foo = sm`flow: ${thisDir}; a-> b;`; }) ) );

  FlowDirections.map(thisDir =>
    it(`Direction "${thisDir}" parses correctly`, t =>
      t.is( thisDir, sm`flow: ${thisDir}; a-> b;`.flow() ) ) );

  it('Fake flow direction throws', t =>
    t.throws( () => { const _foo = sm`flow: yourFlowIsWhackSon; a-> b;`; } ) );

});
