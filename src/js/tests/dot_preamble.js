
import { describe }       from 'ava-spec';
import { FlowDirections } from './constants';





const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('Dot preamble', async it => {

  it(`doesn't throw`, t =>
    t.notThrows( () => { const _foo = sm`dot_preamble: "x -> y;"; a-> b;`; }) );

  it('parses correctly', t =>
    t.is( "x -> y;", sm`dot_preamble: "x -> y;"; a-> b;`.dot_preamble() ) );

});
