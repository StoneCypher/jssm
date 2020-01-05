
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;

describe('State style', async it => {

  NamedColors.map(col =>
    it(`can set the shape of a regular state to ${shape}`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; state: { node_shape: ${shape} }; a-> b;`; }) ) );

  NamedColors.map(col =>
    it(`can set the shape of an input state to ${shape}`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; a-> { edge_color: ${col}; } b;`; }) ) );

  NamedColors.map(col =>
    it(`can set the shape of an output state to ${shape}`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; a-> { edge_color: ${col}; } b;`; }) ) );

});

// TODO FIXME COMEBACK tests for the other color types
// TODO FIXME COMEBACK check that the named colors are coming out sensibly
