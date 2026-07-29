// Unit tests for src/buildjs/build_config_features.cjs — the orchestrator's
// feature catalog (jssm's build DAG expressed as data). Behavioral assertions
// against the real package.json scripts, no golden snapshots.

// eslint-disable-next-line @typescript-eslint/no-var-requires
const F = require('../build_config_features.cjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../../../package.json');

describe('feature catalog', () => {
  test('every feature names a real npm script', () => {
    for (const [name, def] of Object.entries(F.FEATURES)) {
      expect(typeof def.script, `${name}.script`).toBe('string');
      expect(pkg.scripts[def.script], `script "${def.script}" for feature ${name}`).toBeDefined();
    }
  });

  test('every feature is exactly one of mandatory | optional', () => {
    for (const [name, def] of Object.entries(F.FEATURES)) {
      expect(Boolean(def.mandatory) !== Boolean(def.optional), name).toBe(true);
    }
  });

  test('requires only references known features', () => {
    const names = Object.keys(F.FEATURES);
    for (const [name, def] of Object.entries(F.FEATURES)) {
      for (const r of def.requires ?? []) {
        expect(names, `${name} requires unknown ${r}`).toContain(r);
      }
    }
  });

  test('mandatory + optional name lists partition the catalog', () => {
    expect([...F.MANDATORY_FEATURE_NAMES, ...F.OPTIONAL_FEATURE_NAMES].sort())
      .toEqual(Object.keys(F.FEATURES).sort());
  });

  test('name lists are disjoint', () => {
    const inBoth = F.MANDATORY_FEATURE_NAMES.filter(n => F.OPTIONAL_FEATURE_NAMES.includes(n));
    expect(inBoth).toEqual([]);
  });

  test('stages are non-negative integers', () => {
    for (const [name, def] of Object.entries(F.FEATURES)) {
      expect(Array.isArray(def.stages), `${name}.stages`).toBe(true);
      for (const s of def.stages) expect(Number.isInteger(s) && s >= 0, `${name} stage ${s}`).toBe(true);
    }
  });

  test('a feature never runs in a stage earlier than one it requires', () => {
    const minStage = name => Math.min(...F.FEATURES[name].stages);
    for (const [name, def] of Object.entries(F.FEATURES)) {
      for (const r of def.requires ?? []) {
        expect(minStage(name), `${name} must run after ${r}`).toBeGreaterThan(Math.max(...F.FEATURES[r].stages));
      }
    }
  });
});

describe('externalized package-bundle features (v6 workspace split)', () => {
  const pkg_bundlers   = ['make_pkg_viz', 'make_pkg_fence', 'make_pkg_cli'] as const;
  const pkg_finishers  = ['min_pkg_viz', 'min_pkg_fence', 'min_pkg_cli', 'dts_pkg_viz', 'dts_pkg_fence', 'dts_pkg_cli'] as const;

  test('each package feature exists, is optional, on by default, and names a real script', () => {
    for (const name of [...pkg_bundlers, ...pkg_finishers]) {
      const def = F.FEATURES[name];
      expect(def, name).toBeDefined();
      expect(def.optional,       `${name}.optional`).toBe(true);
      expect(def.defaultEnabled, `${name}.defaultEnabled`).toBe(true);
      expect(pkg.scripts[def.script], `script "${def.script}" for feature ${name}`).toBeDefined();
    }
  });

  test('package bundlers run in the rollup stage (4)', () => {
    for (const name of pkg_bundlers) {
      expect(F.FEATURES[name].stages, name).toEqual([4]);
    }
  });

  test('package finishers run in the minify stage (5) and require their stage-4 bundler', () => {
    for (const name of pkg_finishers) {
      expect(F.FEATURES[name].stages, name).toEqual([5]);
      const bundler = name.replace(/^(min|dts)_/, 'make_');
      expect(F.FEATURES[name].requires, name).toContain(bundler);
    }
  });

  test('dts copies also require the embedded bundler that writes the rolled d.ts', () => {
    expect(F.FEATURES.dts_pkg_viz.requires).toContain('make_viz');
    expect(F.FEATURES.dts_pkg_fence.requires).toContain('make_fence');
    expect(F.FEATURES.dts_pkg_cli.requires).toContain('make_cli');
  });

  test('package finisher scripts target files under packages/ only', () => {
    for (const name of pkg_finishers) {
      const script = pkg.scripts[F.FEATURES[name].script];
      const targets = [...script.matchAll(/(?:-o|>)\s+(\S+)|cp\s+\S+\s+(\S+)/g)].map(m => m[1] ?? m[2]);
      expect(targets.length, `${name} must have write targets`).toBeGreaterThan(0);
      for (const out of targets) {
        expect(out.startsWith('packages/'), `${name} writes ${out}`).toBe(true);
      }
    }
  });
});
