
// `extractTypeSurface` wraps whatever `from` throws.  When `from` throws a
// non-Error value (no `.message`), the wrapper falls back to `String(e)`.  No
// real FSL makes the parser throw a non-Error, so this case is exercised by
// mocking `from` to throw a bare string — verifying the fallback still produces
// a TypegenError rather than leaking the raw value.

vi.mock('../../../jssm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../jssm')>();
  return { ...actual, from: () => { throw 'kaboom'; } };
});

import { typegen } from '../../../cli/subcommands/typegen/typegen';
import { TypegenError } from '../../../cli/types';



describe('typegen: non-Error parse failure', () => {

  test('wraps a thrown non-Error value via String(e)', () => {
    expect( () => typegen('a -> b;') ).toThrow(TypegenError);
    expect( () => typegen('a -> b;') ).toThrow(/kaboom/);
  });

});
