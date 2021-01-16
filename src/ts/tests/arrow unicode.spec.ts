 /* eslint-disable max-len */

const jssm = require('../jssm');





describe('arrow_direction', () => {

  test('verify ←', () => expect(jssm.arrow_direction('←')).toBe('left'));
  test('verify ⇐', () => expect(jssm.arrow_direction('⇐')).toBe('left'));
  test('verify ↚', () => expect(jssm.arrow_direction('↚')).toBe('left'));

  test('verify →', () => expect(jssm.arrow_direction('→')).toBe('right'));
  test('verify ⇒', () => expect(jssm.arrow_direction('⇒')).toBe('right'));
  test('verify ↛', () => expect(jssm.arrow_direction('↛')).toBe('right'));

  test('verify ↔', () => expect(jssm.arrow_direction('↔')).toBe('both'));
  test('verify ⇔', () => expect(jssm.arrow_direction('⇔')).toBe('both'));
  test('verify ↮', () => expect(jssm.arrow_direction('↮')).toBe('both'));

  test('verify ←⇒', () => expect(jssm.arrow_direction('←⇒')).toBe('both'));
  test('verify ⇐→', () => expect(jssm.arrow_direction('⇐→')).toBe('both'));
  test('verify ←↛', () => expect(jssm.arrow_direction('←↛')).toBe('both'));
  test('verify ↚→', () => expect(jssm.arrow_direction('↚→')).toBe('both'));
  test('verify ⇐↛', () => expect(jssm.arrow_direction('⇐↛')).toBe('both'));
  test('verify ↚⇒', () => expect(jssm.arrow_direction('↚⇒')).toBe('both'));

});





describe('arrow_left_kind', () => {

  test('verify →', () => expect(jssm.arrow_left_kind('→')).toBe('none'));
  test('verify ⇒', () => expect(jssm.arrow_left_kind('⇒')).toBe('none'));
  test('verify ↛', () => expect(jssm.arrow_left_kind('↛')).toBe('none'));

  test('verify ←', () => expect(jssm.arrow_left_kind('←')).toBe('legal'));
  test('verify ↔', () => expect(jssm.arrow_left_kind('↔')).toBe('legal'));
  test('verify ←⇒', () => expect(jssm.arrow_left_kind('←⇒')).toBe('legal'));
  test('verify ←↛', () => expect(jssm.arrow_left_kind('←↛')).toBe('legal'));

  test('verify ⇐', () => expect(jssm.arrow_left_kind('⇐')).toBe('main'));
  test('verify ⇔', () => expect(jssm.arrow_left_kind('⇔')).toBe('main'));
  test('verify ⇐→', () => expect(jssm.arrow_left_kind('⇐→')).toBe('main'));
  test('verify ⇐↛', () => expect(jssm.arrow_left_kind('⇐↛')).toBe('main'));

  test('verify ↚', () => expect(jssm.arrow_left_kind('↚')).toBe('forced'));
  test('verify ↮', () => expect(jssm.arrow_left_kind('↮')).toBe('forced'));
  test('verify ↚→', () => expect(jssm.arrow_left_kind('↚→')).toBe('forced'));
  test('verify ↚⇒', () => expect(jssm.arrow_left_kind('↚⇒')).toBe('forced'));

});





describe('arrow_right_kind', () => {

  test('verify ←', () => expect(jssm.arrow_right_kind('←')).toBe('none'));
  test('verify ⇐', () => expect(jssm.arrow_right_kind('⇐')).toBe('none'));
  test('verify ↚', () => expect(jssm.arrow_right_kind('↚')).toBe('none'));

  test('verify →', () => expect(jssm.arrow_right_kind('→')).toBe('legal'));
  test('verify ↔', () => expect(jssm.arrow_right_kind('↔')).toBe('legal'));
  test('verify ⇐→', () => expect(jssm.arrow_right_kind('⇐→')).toBe('legal'));
  test('verify ↚→', () => expect(jssm.arrow_right_kind('↚→')).toBe('legal'));

  test('verify ⇒', () => expect(jssm.arrow_right_kind('⇒')).toBe('main'));
  test('verify ⇔', () => expect(jssm.arrow_right_kind('⇔')).toBe('main'));
  test('verify ←⇒', () => expect(jssm.arrow_right_kind('←⇒')).toBe('main'));
  test('verify ↚⇒', () => expect(jssm.arrow_right_kind('↚⇒')).toBe('main'));

  test('verify ↛', () => expect(jssm.arrow_right_kind('↛')).toBe('forced'));
  test('verify ↮', () => expect(jssm.arrow_right_kind('↮')).toBe('forced'));
  test('verify ←↛', () => expect(jssm.arrow_right_kind('←↛')).toBe('forced'));
  test('verify ⇐↛', () => expect(jssm.arrow_right_kind('⇐↛')).toBe('forced'));

});

// stochable
