
import { describe }    from 'ava-spec';
import { NamedColors } from './constants';





const jssm = require('../../../build/jssm.es5.cjs.js'),
      sm   = jssm.sm;





describe('Named colors', async it => {

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

});

// TODO FIXME COMEBACK tests for the other color types
// TODO FIXME COMEBACK check that the named colors are coming out sensibly
