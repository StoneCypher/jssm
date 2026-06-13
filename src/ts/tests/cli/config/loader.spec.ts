import { resolve } from 'path';
import { writeFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { loadConfig } from '../../../cli/config/loader';

const fixtureRoot = resolve(__dirname, 'fixtures');

describe('cli/config/loader', () => {

  it('returns defaults when nothing else is set', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/no-config'),
      skipUserGlobal: true,
    });
    expect(out.render.defaultTarget).toBe('svg');
    expect(out.render.scale).toBe(3);
    expect(out.render.quality).toBe(85);
  });

  it('layers project config over defaults', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/basic-config'),
      skipUserGlobal: true,
    });
    expect(out.render.defaultTarget).toBe('png');
    expect(out.render.scale).toBe(4);
    expect(out.render.quality).toBe(85);  // unset in project, falls through
  });

  it('layers user-global below project', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/basic-config'),
      home: resolve(fixtureRoot, 'home'),
    });
    expect(out.render.scale).toBe(4);   // project wins
  });

  it('uses user-global when project is absent', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/no-config'),
      home: resolve(fixtureRoot, 'home'),
    });
    expect(out.render.scale).toBe(5);   // from user-global
  });

  it('applies flag overrides on top', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/basic-config'),
      skipUserGlobal: true,
      flags: { target: 'jpeg', scale: 7 },
      flagMapping: { target: 'render.defaultTarget', scale: 'render.scale' },
    });
    expect(out.render.defaultTarget).toBe('jpeg');
    expect(out.render.scale).toBe(7);
  });

  it('skipConfig returns defaults+flags only', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/basic-config'),
      skipConfig: true,
      flags: { target: 'png' },
      flagMapping: { target: 'render.defaultTarget' },
    });
    expect(out.render.defaultTarget).toBe('png');
    expect(out.render.scale).toBe(3);   // defaults — project skipped
  });

  it('explicitConfigPath bypasses discovery', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/no-config'),
      explicitConfigPath: resolve(fixtureRoot, 'projects/basic-config/.fsl/config.json'),
      skipUserGlobal: true,
    });
    expect(out.render.defaultTarget).toBe('png');
  });

  it('projectRoot anchors discovery (no walk-up)', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/basic-config'),
      projectRoot: resolve(fixtureRoot, 'projects/no-config'),
      skipUserGlobal: true,
    });
    expect(out.render.defaultTarget).toBe('svg');   // defaults
  });

  it('skipUserGlobal ignores ~/.fsl even if it exists', async () => {
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/no-config'),
      home: resolve(fixtureRoot, 'home'),
      skipUserGlobal: true,
    });
    expect(out.render.scale).toBe(3);   // defaults
  });

  it('gracefully handles absent user-global config', async () => {
    // Point home at a directory with no .fsl/config.json; userGlobal === null
    const out = await loadConfig({
      cwd: resolve(fixtureRoot, 'projects/no-config'),
      home: resolve(fixtureRoot, 'projects/no-config'),
    });
    expect(out.render.scale).toBe(3);   // pure defaults — null branch taken
  });

  it('extracts machine attributes when machinePath is provided', async () => {
    const tmp = `${tmpdir()}/fsl-loader-machine-${process.pid}.fsl`;
    await writeFile(tmp, 'a -> b;');
    try {
      const out = await loadConfig({
        cwd: resolve(fixtureRoot, 'projects/no-config'),
        skipUserGlobal: true,
        machinePath: tmp,
      });
      // v1 extractor returns {} — machine layer is empty
      expect(out.render.defaultTarget).toBe('svg');
    } finally {
      await rm(tmp);
    }
  });

});
