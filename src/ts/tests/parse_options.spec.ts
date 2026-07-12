
import * as jssm from '../jssm';
import type { JssmParseOptions } from '../jssm';

// The public parse/2 wrapper's options parameter is typed as JssmParseOptions
// (fsl #547).  The `locations` flag's behavior is covered in depth by
// locations.spec.ts; these tests pin the rest of the options contract: the
// exported type name is usable at the package boundary, and `startRule` — the
// PEG.js boilerplate option the generated parser honors — accepts its one
// legal value without changing the output tree.

describe('parse/2 options contract', () => {

  test('startRule Document parses identically to the default', () => {
    expect( jssm.parse('a -> b;', { startRule: 'Document' }) ).toEqual(
      [{ key: 'transition', from: 'a', se: { kind: '->', to: 'b' } }]
    );
  });

  test('options typed as exported JssmParseOptions flow through', () => {
    const opts : JssmParseOptions = { locations: true };
    const tree = jssm.parse('a -> b;', opts);
    expect(tree[0]!.loc).toBeDefined();
    expect(tree[0]!.loc!.start.offset).toBe(0);
  });

});
