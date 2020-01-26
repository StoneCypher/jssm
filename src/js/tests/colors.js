
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

  NamedColors.map(col =>
    it(`Color "${col.toLowerCase()}" parses as a color`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; state a: { color: ${col.toLowerCase()}; }; a->b;`; }) ) );

  NamedColors.map(col =>
    it(`Color "${col.toLowerCase()}" parses as a background color`, t =>
      t.notThrows( () => {
        const _foo = sm`machine_name: bob; state a: { background-color: ${col.toLowerCase()}; }; a->b;`; }) ) );

  NamedColors.map(col =>
    it(`Color "${col.toLowerCase()}" parses as a text color`, t =>
      t.notThrows( () => {
        const _foo = sm`machine_name: bob; state a: { text-color: ${col.toLowerCase()}; }; a->b;`; }) ) );

  NamedColors.map(col =>
    it(`Color "${col.toLowerCase()}" parses as a border color`, t =>
      t.notThrows( () => {
        const _foo = sm`machine_name: bob; state a: { border-color: ${col.toLowerCase()}; }; a->b;`; }) ) );

});

// TODO FIXME COMEBACK tests for the other color types
// TODO FIXME COMEBACK check that the named colors are coming out sensibly
