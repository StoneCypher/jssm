
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;

const Directions = ['up','down','left','right'];





describe('Flow directions', async it => {

  Directions.map(thisDir =>
    it(`Direction "${thisDir}" parses as a flow direction`, t =>
      t.notThrows( () => { const _foo = sm`flow: ${thisDir}; a-> b;`; }) ) );

  Directions.map(thisDir =>
    it(`Direction "${thisDir}" parses correctly`, t =>
      t.is( thisDir, sm`flow: ${thisDir}; a-> b;`.flow() ) ) );

  it('Fake flow direction throws', t =>
    t.throws( () => { const _foo = sm`flow: yourFlowIsWhackSon; a-> b;`; } ) );

});
