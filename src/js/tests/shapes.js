
import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;

const Shapes = ["box", "polygon", "ellipse", "oval", "circle", "point", "egg", "triangle", "plaintext", "plain",
  "diamond", "trapezium", "parallelogram", "house", "pentagon", "hexagon", "septagon", "octagon", "doublecircle",
  "doubleoctagon", "tripleoctagon", "invtriangle", "invtrapezium", "invhouse", "Mdiamond", "Msquare", "Mcircle", "rect",
  "rectangle", "square", "star", "none", "underline", "cylinder", "note", "tab", "folder", "box3d", "component",
  "promoter", "cds", "terminator", "utr", "primersite", "restrictionsite", "fivepoverhang", "threepoverhang",
  "noverhang", "assembly", "signature", "insulator", "ribosite", "rnastab", "proteasesite", "proteinstab", "rpromoter",
  "rarrow", "larrow", "lpromoter", "record"];





describe('GraphViz Shapes', async it => {

  Shapes.map(shape =>
    it(`Shape "${shape}" parses as a shape`, t =>
      t.notThrows( () => { const _foo = sm`c: { shape: ${shape}; }; a -> b;`; }) ) );

  // misspelling the last character of restrictionsite gets parser coverage
  it('handles parse end', t =>
    t.throws( () => { const _foo = sm`c: { shape: restrictionsitz; }; a -> b;`; }) );

});
