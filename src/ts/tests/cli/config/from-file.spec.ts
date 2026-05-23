import { resolve } from 'path';
import { loadConfigFile } from '../../../cli/config/sources/from-file';
import { ConfigParseError, ConfigIOError, ConfigSchemaError } from '../../../cli/config/types';

const fixture = (rel: string): string => resolve(__dirname, 'fixtures/projects', rel);

describe('cli/config/sources/from-file', () => {

  it('loads a valid config file', async () => {
    const out = await loadConfigFile(fixture('basic-config/.fsl/config.json'));
    expect(out.render?.defaultTarget).toBe('png');
    expect(out.render?.scale).toBe(4);
  });

  it('strips the $schema key after validation', async () => {
    const out = await loadConfigFile(fixture('basic-config/.fsl/config.json'));
    expect('$schema' in out).toBe(false);
  });

  it('resolves a multi-level extends chain', async () => {
    const out = await loadConfigFile(fixture('extends-chain/.fsl/config.json'));
    expect(out.render).toEqual({ scale: 3, outDir: 'from-middle', quality: 50 });
  });

  it('throws ConfigParseError on malformed JSON', async () => {
    await expect(loadConfigFile(fixture('invalid-json/.fsl/config.json')))
      .rejects.toBeInstanceOf(ConfigParseError);
  });

  it('throws ConfigIOError when the file does not exist', async () => {
    await expect(loadConfigFile(fixture('totally-missing/.fsl/config.json')))
      .rejects.toBeInstanceOf(ConfigIOError);
  });

  it('throws ConfigSchemaError when the config violates the schema', async () => {
    const tmpDir = await import('os').then(os => os.tmpdir());
    const fs = await import('fs/promises');
    const tmp = `${tmpDir}/fsl-config-bad-${process.pid}.json`;
    await fs.writeFile(tmp, JSON.stringify({ render: { defaultTarget: 'tiff' } }));
    try {
      await expect(loadConfigFile(tmp)).rejects.toBeInstanceOf(ConfigSchemaError);
    } finally {
      await fs.unlink(tmp);
    }
  });

});
