
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





const NamedShapes = [

  "box3d", "polygon", "ellipse", "oval", "circle", "point", "egg", "triangle",
  "plaintext", "plain", "diamond", "trapezium", "parallelogram", "house",
  "pentagon", "hexagon", "septagon", "octagon", "doublecircle",
  "doubleoctagon", "tripleoctagon", "invtriangle", "invtrapezium", "invhouse",
  "Mdiamond", "Msquare", "Mcircle", "rectangle", "rect", "square", "star",
  "none", "underline", "cylinder", "note", "tab", "folder", "box", "component",
  "promoter", "cds", "terminator", "utr", "primersite", "restrictionsite",
  "fivepoverhang", "threepoverhang", "noverhang", "assembly", "signature",
  "insulator", "ribosite", "rnastab", "proteasesite", "proteinstab",
  "rpromoter", "rarrow", "larrow", "lpromoter", "record"

];





describe('State style', async it => {

  NamedShapes.map(shape =>
    it(`can set the shape of a regular state to ${shape}`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; state: { shape: ${shape}; }; a-> b;`; }) ) );

  NamedShapes.map(shape =>
    it(`can set the shape of an input state to ${shape}`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; in_state: { shape: ${shape}; }; a-> b;`; }) ) );

  NamedShapes.map(shape =>
    it(`can set the shape of an output state to ${shape}`, t =>
      t.notThrows( () => { const _foo = sm`machine_name: bob; out_state: { shape: ${shape}; }; a-> b;`; }) ) );

});
