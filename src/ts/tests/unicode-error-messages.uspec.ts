
import { sm, compile, parse } from '../jssm';

import { test_range_with } from './unicode.uspec-driver';





// When an operation references an unknown state, jssm throws a JssmError
// whose `requested_state` carries the offending token verbatim and whose
// `.message` embeds it (`... requested "<token>"`).  We sweep every code
// point through `state_for` on a machine that lacks it and confirm the error
// preserves the character — no mojibake, no surrogate-pair truncation.
//
// The code point never transits the FSL parser here (it is passed straight
// to `state_for`), so no parser skip set is needed; the only guard is to skip
// the few code points that happen to be real states in the base machine.

const base = sm`a -> b;`;

const error_message_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (base.has_state(cp)) { return true; }

  let threw = false;

  try {
    base.state_for(cp);
  } catch (error) {
    threw = true;
    expect( error.requested_state      ).toBe(cp);
    expect( error.message.includes(cp) ).toBe(true);
  }

  expect( threw ).toBe(true);

  return true;

};





describe('Characters in error messages', () => {
  test_range_with(1, error_message_test);
});
