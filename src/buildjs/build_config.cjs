/**
 * Config-driven build planner. Loads layered JSON config, applies the selected
 * profile, overlays env-var and CLI overrides, validates each layer, resolves
 * feature dependencies, and returns a runnable stage plan for `run_build.cjs`.
 *
 * Ported from the react_ts_with_claude_gh_template planner, with two
 * jssm-specific changes: it is CommonJS (to match the rest of `src/buildjs`),
 * and config validation is **hand-rolled** rather than zod-based — jssm's
 * feature set is small and closed, so a dependency for it isn't warranted.
 *
 * Config layering (later wins): `build.config.json` (required) →
 * `build.config.<BUILD_ENV>.json` (optional) → `build.config.local.json`
 * (optional) → env-var overrides → CLI overrides. A `--profile` selects a named
 * feature preset applied just after the base layer.
 *
 * @example
 *   const { buildPlan } = require('./build_config.cjs');
 *   const { stages } = buildPlan();           // default profile
 *   const fast = buildPlan({ argv: ['--profile=fast'] });
 *
 * @see ./build_config_features.cjs
 * @see ./run_build.cjs
 */

'use strict';

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const {
  FEATURES,
  MANDATORY_FEATURE_NAMES,
  OPTIONAL_FEATURE_NAMES,
} = require('./build_config_features.cjs');

const ALL_FEATURE_NAMES = [...MANDATORY_FEATURE_NAMES, ...OPTIONAL_FEATURE_NAMES];

/**
 * Build the effective stage plan from layered config + overrides.
 *
 * @param {{ argv?: string[], env?: Record<string,string>, cwd?: string }} [opts]
 * @returns {{ stages: string[][], disabled: string[], warnings: string[] }}
 *   `stages[i]` is the script names to run in parallel as stage i; `disabled`
 *   lists optional features turned off; `warnings` notes auto-disable cascades.
 * @throws {Error} if build.config.json is missing, a profile doesn't exist, a
 *   mandatory feature is targeted for disable, a config layer is invalid, or an
 *   override references an unknown feature.
 *
 * @example
 *   buildPlan({ argv: ['--disable=docs'], cwd: '/repo' }).disabled // includes 'docs'
 */
function buildPlan(opts = {}) {
  const argv = opts.argv ?? process.argv.slice(2);
  const env  = opts.env  ?? process.env;
  const cwd  = opts.cwd  ?? process.cwd();

  const cli     = parseCliFlags(argv);
  const envOpts = parseEnvVars(env);

  if (cli.only && (cli.enable.length || cli.disable.length)) {
    throw new Error('CLI --only conflicts with sibling --enable/--disable/--skip in the same invocation');
  }
  if (envOpts.only && (envOpts.enable.length || envOpts.disable.length)) {
    throw new Error('BUILD_ONLY conflicts with sibling BUILD_ENABLE/BUILD_DISABLE/BUILD_SKIP in the same environment');
  }

  validateOverrideLayer(cli,     'CLI');
  validateOverrideLayer(envOpts, 'env vars');

  const basePath = join(cwd, 'build.config.json');
  if (!existsSync(basePath)) {
    throw new Error(`Missing required config file: ${basePath}`);
  }
  const base = loadAndValidate(basePath);

  const buildEnv = cli.env ?? envOpts.env;
  const envCfg   = buildEnv ? loadIfPresent(join(cwd, `build.config.${buildEnv}.json`)) : null;
  const localCfg = loadIfPresent(join(cwd, 'build.config.local.json'));

  // Collect profile definitions across all layers (later layer wins, wholesale).
  const allProfiles = {};
  for (const layer of [base, envCfg, localCfg]) {
    if (!layer || !layer.profiles) continue;
    for (const [name, def] of Object.entries(layer.profiles)) allProfiles[name] = def;
  }

  const profileName = cli.profile ?? envOpts.profile;
  const merged = { ...defaultFeatures(), ...(base.features ?? {}) };

  if (profileName) {
    const profile = allProfiles[profileName];
    if (!profile) throw new Error(`Profile "${profileName}" not found in any config layer`);
    Object.assign(merged, profile.features ?? {});
  }

  if (envCfg && envCfg.features)   Object.assign(merged, envCfg.features);
  if (localCfg && localCfg.features) Object.assign(merged, localCfg.features);

  applyOverrides(merged, envOpts);
  applyOverrides(merged, cli);

  const explicitlyDisabled = new Set(OPTIONAL_FEATURE_NAMES.filter(n => merged[n] === false));
  const warnings = resolveDependencies(merged, explicitlyDisabled);

  const stages   = bucketByStage(merged);
  const disabled = OPTIONAL_FEATURE_NAMES.filter(n => merged[n] === false);
  return { stages, disabled, warnings };
}

/** Default optional-feature map from the catalog's `defaultEnabled` flags. */
function defaultFeatures() {
  return Object.fromEntries(
    OPTIONAL_FEATURE_NAMES.map(n => [n, FEATURES[n].defaultEnabled === true]),
  );
}

/**
 * Read, JSON-parse, and validate a config file.
 * @param {string} path
 * @returns {object}
 * @throws {Error} on unreadable file, invalid JSON, or schema violation.
 */
function loadAndValidate(path) {
  const text = readFileSync(path, 'utf8');
  let parsed;
  try { parsed = JSON.parse(text); }
  catch (e) { throw new Error(`Invalid JSON in ${path}: ${e.message}`); }
  validateConfig(parsed, path);
  return parsed;
}

/**
 * Hand-rolled config validator (replaces the template's zod schema).
 *
 * Asserts: the document is an object whose keys are a subset of
 * `{features, profiles}`; every `features` key is a known OPTIONAL feature with
 * a boolean value; every profile is an object whose optional `features` obey the
 * same rule. Mandatory features are not configurable (they always run), so
 * naming one is an "unknown feature" here.
 *
 * @param {unknown} cfg
 * @param {string} path - used in error messages
 * @throws {Error} on any violation
 */
function validateConfig(cfg, path) {
  const where = `config in ${path}`;
  if (typeof cfg !== 'object' || cfg === null || Array.isArray(cfg)) {
    throw new Error(`Invalid ${where}: expected an object`);
  }
  for (const key of Object.keys(cfg)) {
    if (key !== 'features' && key !== 'profiles') {
      throw new Error(`Invalid ${where}: unexpected top-level key "${key}"`);
    }
  }
  if (cfg.features !== undefined) validateFeatureMap(cfg.features, where, 'features');
  if (cfg.profiles !== undefined) {
    if (typeof cfg.profiles !== 'object' || cfg.profiles === null || Array.isArray(cfg.profiles)) {
      throw new Error(`Invalid ${where}: "profiles" must be an object`);
    }
    for (const [name, def] of Object.entries(cfg.profiles)) {
      if (typeof def !== 'object' || def === null || Array.isArray(def)) {
        throw new Error(`Invalid ${where}: profile "${name}" must be an object`);
      }
      if (def.features !== undefined) validateFeatureMap(def.features, where, `profile "${name}" features`);
    }
  }
}

/**
 * Validate a feature→boolean map: known optional names, boolean values.
 * @param {unknown} map
 * @param {string} where
 * @param {string} label
 * @throws {Error}
 */
function validateFeatureMap(map, where, label) {
  if (typeof map !== 'object' || map === null || Array.isArray(map)) {
    throw new Error(`Invalid ${where}: "${label}" must be an object`);
  }
  for (const [name, val] of Object.entries(map)) {
    if (!OPTIONAL_FEATURE_NAMES.includes(name)) {
      throw new Error(`Invalid ${where}: unknown feature "${name}" in ${label}`);
    }
    if (typeof val !== 'boolean') {
      throw new Error(`Invalid ${where}: feature "${name}" in ${label} must be boolean`);
    }
  }
}

/**
 * Load+validate an optional config file; null if absent.
 * @param {string} path
 * @returns {object|null}
 */
function loadIfPresent(path) {
  if (!existsSync(path)) return null;
  return loadAndValidate(path);
}

/**
 * Bucket enabled features into a dense array of per-stage script lists.
 * @param {Record<string, boolean>} flags
 * @returns {string[][]}
 */
function bucketByStage(flags) {
  const byStage = new Map();
  for (const [name, def] of Object.entries(FEATURES)) {
    const enabled = def.mandatory || flags[name] === true;
    if (!enabled) continue;
    for (const idx of def.stages) {
      if (!byStage.has(idx)) byStage.set(idx, []);
      byStage.get(idx).push(def.script);
    }
  }
  if (byStage.size === 0) return [];
  const maxIdx = Math.max(...byStage.keys());
  const out = [];
  for (let i = 0; i <= maxIdx; i++) out.push(byStage.get(i) ?? []);
  return out;
}

/**
 * Parse orchestrator CLI argv into an override layer.
 * @param {string[]} argv
 * @returns {{profile?: string, env?: string, only?: string[], enable: string[], disable: string[]}}
 */
function parseCliFlags(argv) {
  const out = { profile: undefined, env: undefined, only: undefined, enable: [], disable: [] };
  for (const arg of argv) {
    if      (arg.startsWith('--profile=')) out.profile = arg.slice('--profile='.length);
    else if (arg.startsWith('--env='))     out.env     = arg.slice('--env='.length);
    else if (arg.startsWith('--only='))    out.only    = arg.slice('--only='.length).split(',').filter(Boolean);
    else if (arg.startsWith('--enable='))  out.enable.push(...arg.slice('--enable='.length).split(',').filter(Boolean));
    else if (arg.startsWith('--disable=')) out.disable.push(...arg.slice('--disable='.length).split(',').filter(Boolean));
    else if (arg.startsWith('--skip='))    out.disable.push(...arg.slice('--skip='.length).split(',').filter(Boolean));
  }
  return out;
}

/**
 * Parse process.env into an override layer using BUILD_* var names.
 * @param {Record<string,string>} env
 * @returns {{profile?: string, env?: string, only?: string[], enable: string[], disable: string[]}}
 */
function parseEnvVars(env) {
  const splitCsv = s => (s ?? '').split(',').filter(Boolean);
  return {
    profile: env.BUILD_PROFILE || undefined,
    env:     env.BUILD_ENV     || undefined,
    only:    env.BUILD_ONLY ? splitCsv(env.BUILD_ONLY) : undefined,
    enable:  splitCsv(env.BUILD_ENABLE),
    disable: [...splitCsv(env.BUILD_DISABLE), ...splitCsv(env.BUILD_SKIP)],
  };
}

/**
 * Apply enable/disable/only directives onto a mutable feature map.
 * `only` is exclusive: every optional not listed is set false.
 * @param {Record<string, boolean>} merged
 * @param {{only?: string[], enable: string[], disable: string[]}} layer
 */
function applyOverrides(merged, layer) {
  if (layer.only) {
    for (const n of OPTIONAL_FEATURE_NAMES) merged[n] = layer.only.includes(n);
    return;
  }
  for (const n of layer.enable)  merged[n] = true;
  for (const n of layer.disable) merged[n] = false;
}

/**
 * Reject typos and protected-feature changes in an override layer.
 * @param {{enable: string[], disable: string[], only?: string[]}} layer
 * @param {string} layerLabel
 * @throws {Error} on unknown name or mandatory-feature disable attempt.
 */
function validateOverrideLayer(layer, layerLabel) {
  const allNames = [...layer.enable, ...layer.disable, ...(layer.only ?? [])];
  for (const n of allNames) {
    if (!ALL_FEATURE_NAMES.includes(n)) throw new Error(`${layerLabel}: unknown feature "${n}"`);
  }
  for (const n of layer.disable) {
    if (MANDATORY_FEATURE_NAMES.includes(n)) {
      throw new Error(`${layerLabel}: cannot disable mandatory feature "${n}"`);
    }
  }
}

/**
 * Cascade-disable optional features whose required upstream is off, to a fixed
 * point. Warns once per auto-disable (not for features the user already turned off).
 * @param {Record<string, boolean>} merged
 * @param {Set<string>} explicitlyDisabled
 * @returns {string[]} warning lines
 */
function resolveDependencies(merged, explicitlyDisabled) {
  const warnings = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const [name, def] of Object.entries(FEATURES)) {
      if (!def.optional || merged[name] !== true || !def.requires) continue;
      for (const req of def.requires) {
        const reqDef = FEATURES[req];
        const reqEnabled = reqDef.mandatory || merged[req] === true;
        if (!reqEnabled) {
          merged[name] = false;
          if (!explicitlyDisabled.has(name)) {
            warnings.push(`auto-disabling ${name} because required feature ${req} is disabled`);
            explicitlyDisabled.add(name);
          }
          changed = true;
        }
      }
    }
  }
  return warnings;
}

module.exports = { buildPlan };
