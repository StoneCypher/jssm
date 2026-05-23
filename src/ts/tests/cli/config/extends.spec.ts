import { resolveExtends } from '../../../cli/config/extends';
import { ConfigExtendsError } from '../../../cli/config/types';
import type { Reader, PartialConfig } from '../../../cli/config/types';

// Build a reader from an in-memory file map for testing.
const makeReader = (files: Record<string, string>): Reader => async (path: string) => {
  if (!(path in files)) throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
  return files[path];
};

describe('cli/config/extends', () => {

  it('returns the input unchanged when no extends present', async () => {
    const reader = makeReader({});
    const out = await resolveExtends({ render: { scale: 4 } }, '/p/.fsl/config.json', reader);
    expect(out).toEqual({ render: { scale: 4 } });
  });

  it('resolves a single string extends', async () => {
    const reader = makeReader({
      '/p/base.json': JSON.stringify({ render: { scale: 2, outDir: 'b' } }),
    });
    const out = await resolveExtends(
      { extends: './base.json', render: { scale: 9 } },
      '/p/.fsl/config.json',
      reader,
    );
    expect(out.render).toEqual({ scale: 9, outDir: 'b' });
  });

  it('resolves array extends in order (later wins)', async () => {
    const reader = makeReader({
      '/p/a.json': JSON.stringify({ render: { scale: 1, outDir: 'a', quality: 10 } }),
      '/p/b.json': JSON.stringify({ render: { scale: 2, outDir: 'b' } }),
    });
    const out = await resolveExtends(
      { extends: ['./a.json', './b.json'], render: { scale: 9 } },
      '/p/.fsl/config.json',
      reader,
    );
    expect(out.render).toEqual({ scale: 9, outDir: 'b', quality: 10 });
  });

  it('strips the extends key from the returned config', async () => {
    const reader = makeReader({
      '/p/base.json': JSON.stringify({ render: { scale: 1 } }),
    });
    const out = await resolveExtends(
      { extends: './base.json' } as PartialConfig,
      '/p/.fsl/config.json',
      reader,
    );
    expect('extends' in out).toBe(false);
  });

  it('resolves paths relative to the file that contains the extends', async () => {
    const reader = makeReader({
      '/p/nested/dir/base.json': JSON.stringify({ render: { scale: 7 } }),
    });
    const out = await resolveExtends(
      { extends: './base.json' },
      '/p/nested/dir/.fsl/config.json',
      reader,
    );
    expect(out.render?.scale).toBe(7);
  });

  it('throws ConfigExtendsError on a cycle', async () => {
    const reader = makeReader({
      '/p/a.json': JSON.stringify({ extends: './b.json' }),
      '/p/b.json': JSON.stringify({ extends: './a.json' }),
    });
    await expect(resolveExtends(
      { extends: './a.json' },
      '/p/.fsl/config.json',
      reader,
    )).rejects.toBeInstanceOf(ConfigExtendsError);
  });

  it('throws ConfigExtendsError when depth exceeds 32', async () => {
    const files: Record<string, string> = {};
    for (let i = 0; i < 33; i++) {
      files[`/p/n${i}.json`] = JSON.stringify({ extends: `./n${i + 1}.json` });
    }
    files['/p/n33.json'] = JSON.stringify({ render: { scale: 1 } });
    const reader = makeReader(files);
    await expect(resolveExtends(
      { extends: './n0.json' },
      '/p/.fsl/config.json',
      reader,
    )).rejects.toBeInstanceOf(ConfigExtendsError);
  });

  it('propagates the reader error wrapped (e.g. ENOENT)', async () => {
    const reader = makeReader({});
    await expect(resolveExtends(
      { extends: './missing.json' },
      '/p/.fsl/config.json',
      reader,
    )).rejects.toThrow(/missing\.json|ENOENT/);
  });

  it('resolves nested extends (a extends b extends c)', async () => {
    const reader = makeReader({
      '/p/c.json': JSON.stringify({ render: { scale: 1, outDir: 'c-dir', quality: 99 } }),
      '/p/b.json': JSON.stringify({ extends: './c.json', render: { scale: 2, outDir: 'b-dir' } }),
      '/p/a.json': JSON.stringify({ extends: './b.json', render: { scale: 3 } }),
    });
    const out = await resolveExtends(
      { extends: './a.json' },
      '/p/.fsl/config.json',
      reader,
    );
    expect(out.render).toEqual({ scale: 3, outDir: 'b-dir', quality: 99 });
  });

  it('validates each base file against the schema and rejects violations', async () => {
    const { ConfigSchemaError } = await import('../../../cli/config/types');
    const reader = makeReader({
      '/p/bad-base.json': JSON.stringify({ render: { defaultTarget: 'tiff' } }),
    });
    await expect(resolveExtends(
      { extends: './bad-base.json' },
      '/p/.fsl/config.json',
      reader,
    )).rejects.toBeInstanceOf(ConfigSchemaError);
  });

  it('throws ConfigParseError when a base file is malformed JSON', async () => {
    const { ConfigParseError } = await import('../../../cli/config/types');
    const reader = makeReader({
      '/p/bad.json': '{ this is not json',
    });
    await expect(resolveExtends(
      { extends: './bad.json' },
      '/p/.fsl/config.json',
      reader,
    )).rejects.toBeInstanceOf(ConfigParseError);
  });

});
