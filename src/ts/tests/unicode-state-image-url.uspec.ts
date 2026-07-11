
import { sm, compile, parse } from '../jssm';

import { test_range_with } from './unicode.uspec-driver';





// The `image:` and `url:` state style items take quoted Strings (image paths
// and URLs), so they carry arbitrary Unicode.  Both are swept here.  Verified
// at the parse-AST level: `{ key: 'image', value }` and `{ key: 'url', value }`
// items inside a state declaration.  As String positions, only `"` and `\`
// need skipping.

const string_skips = new Set(['"', '\\']);

const image_url_test = (idx: number): boolean => {

  const cp = String.fromCodePoint(idx);

  if (!(string_skips.has(cp))) {

    let ast;

    try {
      ast = parse(`state s: { image: "${cp}"; url: "${cp}"; }; s -> b;`);
    } catch {
      throw new Error(`Broke on ${idx} "${cp}"`);
    }

    const items = ast[0].value;
    const image = items.find((i: any) => i.key === 'image');
    const url   = items.find((i: any) => i.key === 'url');

    expect( image?.value ).toBe(cp);
    expect( url?.value   ).toBe(cp);

  }

  return true;

};





describe('Characters in image and url style items', () => {
  test_range_with(2, image_url_test);
});
