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
