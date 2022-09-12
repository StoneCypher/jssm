
import { sm, Machine } from '../jssm';





// most of the supporting defect-attrition test stuff is on the labels, not the
// caller, so there's no sense repeating what's in state_label.spec

describe('Display text', () => {

  test(`Atom labels read out correctly`, () =>
    expect( sm`a -> b; state a: { label: atomtest; };`.display_text('a') )
      .toBe('atomtest') );

  test(`String labels read out correctly`, () =>
    expect( sm`a -> b; state a: { label: "string test"; };`.display_text('a') )
      .toBe('string test') );

  test(`Missing labels read out as undefined`, () =>
    expect( sm`a -> b; state a: { label: atomtest; };`.display_text('b') )
      .toBe('b') );

});
