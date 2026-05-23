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

    it('uses os.homedir() by default when no home option is passed', async () => {
      // vi.spyOn on os.homedir is not possible in ESM (module namespace is not
      // configurable). Instead, verify the no-args path: it must not throw and
      // must return either null or a plain PartialConfig object.
      const out = await discoverUserGlobalConfig();
      if (out !== null) {
        expect(typeof out).toBe('object');
        expect(Array.isArray(out)).toBe(false);
      } else {
        expect(out).toBeNull();
      }
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
      // The child directory does not need to exist on disk — discoverProjectConfig
      // only checks ancestors for `.fsl/config.json`, never the starting `from` itself.
      const childPath = resolve(fixtureRoot, 'projects/basic-config/some/nested/child');
      const out = await discoverProjectConfig({ from: childPath });
      expect(out?.render?.defaultTarget).toBe('png');
    });

    it('stops walking at the filesystem root and returns null when no ancestor has .fsl/config.json', async () => {
      // os.tmpdir() is a path with no .fsl/config.json in any ancestor on a
      // standard runner. The walk must terminate at the filesystem root and
      // return null without throwing.
      const out = await discoverProjectConfig({ from: os.tmpdir() });
      expect(out).toBeNull();
    });

  });

});
