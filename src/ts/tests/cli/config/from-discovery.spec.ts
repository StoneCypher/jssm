import { resolve } from 'path';
import * as os from 'os';
import {
  discoverUserGlobalConfig,
  discoverProjectConfig,
} from '../../../cli/config/sources/from-discovery';

const fixtureRoot = resolve(__dirname, 'fixtures');
const fakeHome    = resolve(fixtureRoot, 'home');

describe('cli/config/sources/from-discovery', () => {

  describe('discoverUserGlobalConfig', () => {

    it('returns null when ~/.fsl/config.json does not exist', async () => {
      const out = await discoverUserGlobalConfig({ home: resolve(fixtureRoot, 'projects/no-config') });
      expect(out).toBeNull();
    });

    it('returns the parsed config when ~/.fsl/config.json exists', async () => {
      const out = await discoverUserGlobalConfig({ home: fakeHome });
      expect(out?.render?.scale).toBe(5);
    });

    it('defaults to os.homedir() when no home option is passed', async () => {
      const out = await discoverUserGlobalConfig();
      expect(out === null || typeof out === 'object').toBe(true);
    });

  });

  describe('discoverProjectConfig', () => {

    it('returns null when no .fsl/config.json exists in cwd or any ancestor', async () => {
      const out = await discoverProjectConfig({ from: resolve(fixtureRoot, 'projects/no-config') });
      expect(out).toBeNull();
    });

    it('returns the parsed config when .fsl/config.json exists at the from directory', async () => {
      const out = await discoverProjectConfig({ from: resolve(fixtureRoot, 'projects/basic-config') });
      expect(out?.render?.defaultTarget).toBe('png');
    });

    it('walks up from a child directory and finds an ancestor .fsl/config.json', async () => {
      const childPath = resolve(fixtureRoot, 'projects/basic-config/some/nested/child');
      const out = await discoverProjectConfig({ from: childPath });
      expect(out?.render?.defaultTarget).toBe('png');
    });

    it('stops walking at the filesystem root without throwing', async () => {
      const out = await discoverProjectConfig({ from: os.tmpdir() });
      expect(out === null || typeof out === 'object').toBe(true);
    });

  });

});
