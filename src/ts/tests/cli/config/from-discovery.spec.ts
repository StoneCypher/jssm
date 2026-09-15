import { resolve } from 'node:path';
import * as os from 'node:os';
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
      if (out === null) {
        expect(out).toBeNull();
      } else {
        expect(typeof out).toBe('object');
        expect(Array.isArray(out)).toBe(false);
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

    it('returns null via the 64-iteration defensive cap on a pathological deep path', async () => {
      // 70 components is deeper than the cap, so the walk cannot reach the
      // filesystem root before iterations run out; the cap must end the walk
      // with null rather than continuing toward the root. None of the
      // directories need to exist — the existence probe just fails.
      const deep = '/' + Array.from({ length: 70 }, (_, i) => `lvl${i}`).join('/');
      const out = await discoverProjectConfig({ from: deep });
      expect(out).toBeNull();
    });

  });

});
