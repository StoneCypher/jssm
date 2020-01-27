
import { describe }    from 'ava-spec';
import { NamedColors } from './constants';





const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('Named colors', async it => {

/* eslint-disable max-nested-callbacks */

  // edge things
  ['edge_color'].map(prop =>

    NamedColors.map(col =>
      [col, col.toLowerCase()].map(repres =>
        it(`Color "${repres}" parses as ${prop}`, t =>
          t.notThrows( () => { const _foo = sm`machine_name: bob; a-> { ${prop}: ${repres}; } b;`; })
        )
      )
    )

  );

  // state things
  ['color', 'background-color', 'text-color', 'border-color'].map(prop =>

    NamedColors.map(col =>
      [col, col.toLowerCase()].map(repres =>
        it(`Color "${repres}" parses as ${prop}`, t =>
          t.notThrows( () => { const _foo = sm`machine_name: bob; state a: { ${prop}: ${repres}; }; a -> b;`; })
        )
      )
    )

  );

/* eslint-enable max-nested-callbacks */

});

// TODO FIXME COMEBACK tests for the other color types
// TODO FIXME COMEBACK check that the named colors are coming out sensibly

// TODO FIXME COMEBACK assert that #f00, #ff0000, #f00f, #ff0000ff, and red all parse as the same color
