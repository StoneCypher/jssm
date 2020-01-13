
import { describe }    from 'ava-spec';
import { NamedColors } from './constants';





const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('Named colors', async it => {

  NamedColors.map(col =>
    it(`Color "${col}" parses as an edge color`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; a-> { edge_color: ${col}; } b;`; }) ) );

  NamedColors.map(col =>
    it(`Color "${col.toLowerCase()}" parses as an edge color`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; a-> { edge_color: ${col.toLowerCase()}; } b;`; }) ) );

});

// TODO FIXME COMEBACK tests for the other color types
// TODO FIXME COMEBACK check that the named colors are coming out sensibly
