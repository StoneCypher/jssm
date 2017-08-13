
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.js');





describe('arrow_direction', async it => {

  it('<-',   t => t.is('left',  jssm.arrow_direction('<-')   ) );
  it('<=',   t => t.is('left',  jssm.arrow_direction('<=')   ) );
  it('<~',   t => t.is('left',  jssm.arrow_direction('<~')   ) );

  it('->',   t => t.is('right', jssm.arrow_direction('->')   ) );
  it('=>',   t => t.is('right', jssm.arrow_direction('=>')   ) );
  it('~>',   t => t.is('right', jssm.arrow_direction('~>')   ) );

  it('<->',  t => t.is('both',  jssm.arrow_direction('<->')  ) );
  it('<=>',  t => t.is('both',  jssm.arrow_direction('<=>')  ) );
  it('<~>',  t => t.is('both',  jssm.arrow_direction('<~>')  ) );

  it('<-=>', t => t.is('both',  jssm.arrow_direction('<-=>') ) );
  it('<=->', t => t.is('both',  jssm.arrow_direction('<=->') ) );
  it('<-~>', t => t.is('both',  jssm.arrow_direction('<-~>') ) );
  it('<~->', t => t.is('both',  jssm.arrow_direction('<~->') ) );
  it('<=~>', t => t.is('both',  jssm.arrow_direction('<=~>') ) );
  it('<~=>', t => t.is('both',  jssm.arrow_direction('<~=>') ) );

});





describe('arrow_left_kind', async it => {

  it('->',   t => t.is('none',   jssm.arrow_left_kind('->')   ) );
  it('=>',   t => t.is('none',   jssm.arrow_left_kind('=>')   ) );
  it('~>',   t => t.is('none',   jssm.arrow_left_kind('~>')   ) );

  it('<-',   t => t.is('legal',  jssm.arrow_left_kind('<-')   ) );
  it('<->',  t => t.is('legal',  jssm.arrow_left_kind('<->')  ) );
  it('<-=>', t => t.is('legal',  jssm.arrow_left_kind('<-=>') ) );
  it('<-~>', t => t.is('legal',  jssm.arrow_left_kind('<-~>') ) );

  it('<=',   t => t.is('main',   jssm.arrow_left_kind('<=')   ) );
  it('<=>',  t => t.is('main',   jssm.arrow_left_kind('<=>')  ) );
  it('<=->', t => t.is('main',   jssm.arrow_left_kind('<=->') ) );
  it('<=~>', t => t.is('main',   jssm.arrow_left_kind('<=~>') ) );

  it('<~',   t => t.is('forced', jssm.arrow_left_kind('<~')   ) );
  it('<~>',  t => t.is('forced', jssm.arrow_left_kind('<~>')  ) );
  it('<~->', t => t.is('forced', jssm.arrow_left_kind('<~->') ) );
  it('<~=>', t => t.is('forced', jssm.arrow_left_kind('<~=>') ) );

});





describe('arrow_right_kind', async it => {

  it('<-',   t => t.is('none',   jssm.arrow_right_kind('<-')   ) );
  it('<=',   t => t.is('none',   jssm.arrow_right_kind('<=')   ) );
  it('<~',   t => t.is('none',   jssm.arrow_right_kind('<~')   ) );

  it('->',   t => t.is('legal',  jssm.arrow_right_kind('->')   ) );
  it('<->',  t => t.is('legal',  jssm.arrow_right_kind('<->')  ) );
  it('<=->', t => t.is('legal',  jssm.arrow_right_kind('<=->') ) );
  it('<~->', t => t.is('legal',  jssm.arrow_right_kind('<~->') ) );

  it('=>',   t => t.is('main',   jssm.arrow_right_kind('=>')   ) );
  it('<=>',  t => t.is('main',   jssm.arrow_right_kind('<=>')  ) );
  it('<-=>', t => t.is('main',   jssm.arrow_right_kind('<-=>') ) );
  it('<~=>', t => t.is('main',   jssm.arrow_right_kind('<~=>') ) );

  it('~>',   t => t.is('forced', jssm.arrow_right_kind('~>')   ) );
  it('<~>',  t => t.is('forced', jssm.arrow_right_kind('<~>')  ) );
  it('<-~>', t => t.is('forced', jssm.arrow_right_kind('<-~>') ) );
  it('<=~>', t => t.is('forced', jssm.arrow_right_kind('<=~>') ) );

});





describe('error catchery', async _parse_it => {

  describe('unknown arrow direction', async it => {
    it('throws', t => t.throws( () => { jssm.arrow_direction('boop'); } ));
  });

  describe('unknown arrow left kind', async it => {
    it('throws', t => t.throws( () => { jssm.arrow_left_kind('boop'); } ));
  });

  describe('unknown arrow right kind', async it => {
    it('throws', t => t.throws( () => { jssm.arrow_right_kind('boop'); } ));
  });

});

// stochable
