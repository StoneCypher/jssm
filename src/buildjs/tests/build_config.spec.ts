// Unit tests for src/buildjs/build_config.cjs — the config-driven stage planner.
// Pure logic: cwd/argv/env are injected and a fixture build.config.json is
// written to a temp dir, so nothing touches the real repo config or process env.

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { buildPlan } = require('../build_config.cjs');

/** Write a build.config.json into a fresh temp dir and return that dir. */
function fixtureDir(config: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), 'jssm-buildcfg-'));
  writeFileSync(join(dir, 'build.config.json'), JSON.stringify(config));
  return dir;
}

const ALL_ON = {
  features: {},                       // empty → catalog defaults (all optional on)
  profiles: {
    fast: { features: { eslint: false, audit: false, vitest: false, docs: false } },
    coreless: { features: { make_core: false } },
  },
};

const flat = (stages: string[][]) => stages.flat();

describe('buildPlan — defaults', () => {
  test('includes mandatory scripts and buckets clean into stage 0', () => {
    const dir = fixtureDir(ALL_ON);
    const { stages } = buildPlan({ argv: [], env: {}, cwd: dir });
    expect(stages[0]).toContain('clean');
    expect(flat(stages)).toEqual(expect.arrayContaining(['makever', 'peg', 'typescript']));
    rmSync(dir, { recursive: true, force: true });
  });

  test('default plan enables all optional features', () => {
    const dir = fixtureDir(ALL_ON);
    const { stages, disabled } = buildPlan({ argv: [], env: {}, cwd: dir });
    expect(disabled).toEqual([]);
    expect(flat(stages)).toContain('readme'); // a leaf, default-on
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('buildPlan — profiles', () => {
  test('--profile=fast drops the disabled optionals', () => {
    const dir = fixtureDir(ALL_ON);
    const { stages, disabled } = buildPlan({ argv: ['--profile=fast'], env: {}, cwd: dir });
    const scripts = flat(stages);
    expect(scripts).not.toContain('eslint');
    expect(scripts).not.toContain('vitest');
    expect(scripts).not.toContain('docs');
    expect(disabled).toEqual(expect.arrayContaining(['eslint', 'audit', 'vitest', 'docs']));
    expect(scripts).toContain('make_core'); // still on under fast
    rmSync(dir, { recursive: true, force: true });
  });

  test('BUILD_PROFILE env selects the profile too', () => {
    const dir = fixtureDir(ALL_ON);
    const { disabled } = buildPlan({ argv: [], env: { BUILD_PROFILE: 'fast' }, cwd: dir });
    expect(disabled).toContain('docs');
    rmSync(dir, { recursive: true, force: true });
  });

  test('unknown profile throws', () => {
    const dir = fixtureDir(ALL_ON);
    expect(() => buildPlan({ argv: ['--profile=nope'], env: {}, cwd: dir })).toThrow(/profile/i);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('buildPlan — overrides', () => {
  test('--disable=docs removes docs and lists it disabled', () => {
    const dir = fixtureDir(ALL_ON);
    const { stages, disabled } = buildPlan({ argv: ['--disable=docs'], env: {}, cwd: dir });
    expect(flat(stages)).not.toContain('docs');
    expect(disabled).toContain('docs');
    rmSync(dir, { recursive: true, force: true });
  });

  test('--only=eslint disables every other optional', () => {
    const dir = fixtureDir(ALL_ON);
    const { stages } = buildPlan({ argv: ['--only=eslint'], env: {}, cwd: dir });
    const scripts = flat(stages);
    expect(scripts).toContain('eslint');
    expect(scripts).toContain('clean');       // mandatory still runs
    expect(scripts).not.toContain('docs');
    expect(scripts).not.toContain('make_core');
    rmSync(dir, { recursive: true, force: true });
  });

  test('unknown feature in --enable throws', () => {
    const dir = fixtureDir(ALL_ON);
    expect(() => buildPlan({ argv: ['--enable=bogus'], env: {}, cwd: dir })).toThrow(/unknown feature/i);
    rmSync(dir, { recursive: true, force: true });
  });

  test('disabling a mandatory feature throws', () => {
    const dir = fixtureDir(ALL_ON);
    expect(() => buildPlan({ argv: ['--disable=typescript'], env: {}, cwd: dir })).toThrow(/mandatory/i);
    rmSync(dir, { recursive: true, force: true });
  });

  test('--only with sibling --enable throws', () => {
    const dir = fixtureDir(ALL_ON);
    expect(() => buildPlan({ argv: ['--only=eslint', '--enable=docs'], env: {}, cwd: dir })).toThrow(/conflicts/i);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('buildPlan — dependency cascade', () => {
  test('disabling make_core cascade-disables its minifiers and site, with warnings', () => {
    const dir = fixtureDir(ALL_ON);
    const { stages, disabled, warnings } = buildPlan({ argv: ['--profile=coreless'], env: {}, cwd: dir });
    const scripts = flat(stages);
    expect(scripts).not.toContain('make_core');
    expect(scripts).not.toContain('min_iife'); // requires make_core
    expect(scripts).not.toContain('site');     // requires min_iife
    expect(disabled).toEqual(expect.arrayContaining(['make_core', 'min_iife', 'min_es6', 'min_cjs', 'site']));
    expect(warnings.some(w => /auto-disabl/i.test(w))).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('buildPlan — config errors', () => {
  test('missing build.config.json throws', () => {
    const dir = mkdtempSync(join(tmpdir(), 'jssm-nocfg-'));
    expect(() => buildPlan({ argv: [], env: {}, cwd: dir })).toThrow(/Missing required config/i);
    rmSync(dir, { recursive: true, force: true });
  });

  test('unknown feature key in config features throws', () => {
    const dir = fixtureDir({ features: { nope: false }, profiles: {} });
    expect(() => buildPlan({ argv: [], env: {}, cwd: dir })).toThrow(/unknown feature/i);
    rmSync(dir, { recursive: true, force: true });
  });

  test('non-boolean feature value in config throws', () => {
    const dir = fixtureDir({ features: { docs: 'yes' }, profiles: {} });
    expect(() => buildPlan({ argv: [], env: {}, cwd: dir })).toThrow(/boolean/i);
    rmSync(dir, { recursive: true, force: true });
  });
});
