
import { describe } from 'ava-spec';
import { Shapes }   from './constants.js';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('State style', async it => {

  Shapes.map(shape =>
    it(`can set the shape of a regular state to ${shape}`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; state: { shape: ${shape}; }; a-> b;`; }) ) );

  Shapes.map(shape =>
    it(`can set the shape of a start state to ${shape}`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; start_state: { shape: ${shape}; }; a-> b;`; }) ) );

  Shapes.map(shape =>
    it(`can set the shape of an end state to ${shape}`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; end_state: { shape: ${shape}; }; a-> b;`; }) ) );

});
