
/* eslint-disable max-len */

import {describe} from 'ava-spec';

const jssm = require('../../../build/jssm.es5.cjs.js');





describe('arrow_direction', async it => {

  it('←', t => t.is('left', jssm.arrow_direction('←')));
  it('⇐', t => t.is('left', jssm.arrow_direction('⇐')));
  it('↚', t => t.is('left', jssm.arrow_direction('↚')));

  it('→', t => t.is('right', jssm.arrow_direction('→')));
  it('⇒', t => t.is('right', jssm.arrow_direction('⇒')));
  it('↛', t => t.is('right', jssm.arrow_direction('↛')));

  it('↔', t => t.is('both', jssm.arrow_direction('↔')));
  it('⇔', t => t.is('both', jssm.arrow_direction('⇔')));
  it('↮', t => t.is('both', jssm.arrow_direction('↮')));

  it('←⇒', t => t.is('both', jssm.arrow_direction('←⇒')));
  it('⇐→', t => t.is('both', jssm.arrow_direction('⇐→')));
  it('←↛', t => t.is('both', jssm.arrow_direction('←↛')));
  it('↚→', t => t.is('both', jssm.arrow_direction('↚→')));
  it('⇐↛', t => t.is('both', jssm.arrow_direction('⇐↛')));
  it('↚⇒', t => t.is('both', jssm.arrow_direction('↚⇒')));

});





describe('arrow_left_kind', async it => {

  it('→', t => t.is('none', jssm.arrow_left_kind('→')));
  it('⇒', t => t.is('none', jssm.arrow_left_kind('⇒')));
  it('↛', t => t.is('none', jssm.arrow_left_kind('↛')));

  it('←', t => t.is('legal', jssm.arrow_left_kind('←')));
  it('↔', t => t.is('legal', jssm.arrow_left_kind('↔')));
  it('←⇒', t => t.is('legal', jssm.arrow_left_kind('←⇒')));
  it('←↛', t => t.is('legal', jssm.arrow_left_kind('←↛')));

  it('⇐', t => t.is('main', jssm.arrow_left_kind('⇐')));
  it('⇔', t => t.is('main', jssm.arrow_left_kind('⇔')));
  it('⇐→', t => t.is('main', jssm.arrow_left_kind('⇐→')));
  it('⇐↛', t => t.is('main', jssm.arrow_left_kind('⇐↛')));

  it('↚', t => t.is('forced', jssm.arrow_left_kind('↚')));
  it('↮', t => t.is('forced', jssm.arrow_left_kind('↮')));
  it('↚→', t => t.is('forced', jssm.arrow_left_kind('↚→')));
  it('↚⇒', t => t.is('forced', jssm.arrow_left_kind('↚⇒')));

});





describe('arrow_right_kind', async it => {

  it('←', t => t.is('none', jssm.arrow_right_kind('←')));
  it('⇐', t => t.is('none', jssm.arrow_right_kind('⇐')));
  it('↚', t => t.is('none', jssm.arrow_right_kind('↚')));

  it('→', t => t.is('legal', jssm.arrow_right_kind('→')));
  it('↔', t => t.is('legal', jssm.arrow_right_kind('↔')));
  it('⇐→', t => t.is('legal', jssm.arrow_right_kind('⇐→')));
  it('↚→', t => t.is('legal', jssm.arrow_right_kind('↚→')));

  it('⇒', t => t.is('main', jssm.arrow_right_kind('⇒')));
  it('⇔', t => t.is('main', jssm.arrow_right_kind('⇔')));
  it('←⇒', t => t.is('main', jssm.arrow_right_kind('←⇒')));
  it('↚⇒', t => t.is('main', jssm.arrow_right_kind('↚⇒')));

  it('↛', t => t.is('forced', jssm.arrow_right_kind('↛')));
  it('↮', t => t.is('forced', jssm.arrow_right_kind('↮')));
  it('←↛', t => t.is('forced', jssm.arrow_right_kind('←↛')));
  it('⇐↛', t => t.is('forced', jssm.arrow_right_kind('⇐↛')));

});

// stochable
