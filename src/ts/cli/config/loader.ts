/**
 * The CLI-environment orchestrator. Collects every config layer (defaults,
 * user-global, project, machine attributes, flag overrides) and merges
 * them into a `ResolvedConfig`.
 *
 * Non-CLI consumers (GitHub Actions, editor plugins, static-site
 * generators) can use this same function — pass `skipUserGlobal: true`
 * for reproducibility and/or `projectRoot` to anchor discovery.
 *
 * Browser consumers should skip this and use `mergeConfigs` + the pure
 * helpers directly.
 *
 * Node-only.
 */

import { readFile } from 'fs/promises';
import type { PartialConfig, ResolvedConfig } from './types';
import type { FlagMapping } from './sources/from-flags';
import { mergeConfigs } from './merge';
import { defaults } from './defaults';
import { discoverUserGlobalConfig, discoverProjectConfig } from './sources/from-discovery';
import { loadConfigFile } from './sources/from-file';
import { extractMachineAttributes } from './sources/from-machine';
import { flagsToConfig } from './sources/from-flags';

/** Options accepted by `loadConfig`. */
export interface LoadConfigOptions {
  /** Base for walk-up discovery. Usually `process.cwd()`. */
  cwd: string;
  /** Anchor discovery here instead of walking up from cwd. */
  projectRoot?: string;
  /** If set, run `extractMachineAttributes` on this file's content. */
  machinePath?: string;
  /** Parsed CLI flags. */
  flags?: Record<string, unknown>;
  /** Flag → config-dot-path mapping table. */
  flagMapping?: FlagMapping;
  /** Bypass project discovery; load exactly this file. */
  explicitConfigPath?: string;
  /** Skip ALL discovery (defaults + flags only). */
  skipConfig?: boolean;
  /** Skip the ~/.fsl layer specifically (Action / CI / sandbox use). */
  skipUserGlobal?: boolean;
  /** Override home directory (test seam). */
  home?: string;
}

/**
 * Load and merge every config layer for the CLI environment.
 *
 * Layer precedence (lowest to highest):
 *   1. Built-in defaults
 *   2. User-global config (~/.fsl/config.json) — skipped if `skipUserGlobal`
 *   3. Project config (walking up from cwd or anchored at `projectRoot`)
 *   4. Machine source attributes (from `machinePath` if provided)
 *   5. CLI flag overrides (`flags` + `flagMapping`)
 *
 * @param opts - Options controlling which layers to load and how to discover them.
 * @returns A complete `ResolvedConfig` with defaults populated.
 * @throws Any of the `Config*Error` classes if a discovered file is malformed.
 *
 * @example
 *   const cfg = await loadConfig({ cwd: process.cwd(), flags, flagMapping });
 *
 * @example
 *   // GitHub Action use
 *   const cfg = await loadConfig({
 *     cwd:            process.env.GITHUB_WORKSPACE,
 *     projectRoot:    process.env.GITHUB_WORKSPACE,
 *     skipUserGlobal: true,
 *     flags:          inputs,
 *     flagMapping:    ACTION_INPUT_TO_CONFIG,
 *   });
 */
export async function loadConfig(opts: LoadConfigOptions): Promise<ResolvedConfig> {
  const layers: PartialConfig[] = [defaults];

  if (!opts.skipConfig) {
    if (opts.explicitConfigPath) {
      const explicit = await loadConfigFile(opts.explicitConfigPath);
      layers.push(explicit);
    } else {
      if (!opts.skipUserGlobal) {
        const userGlobal = await discoverUserGlobalConfig({ home: opts.home });
        if (userGlobal) layers.push(userGlobal);
      }
      const projectFrom = opts.projectRoot ?? opts.cwd;
      const project = await discoverProjectConfig({ from: projectFrom });
      if (project) layers.push(project);
    }
  }

  if (opts.machinePath) {
    try {
      const source = await readFile(opts.machinePath, 'utf8');
      layers.push(extractMachineAttributes(source));
    } catch {
      // Best-effort. If the machine path can't be read, the render step
      // surfaces it as its own error. Don't double-report here.
    }
  }

  if (opts.flags && opts.flagMapping) {
    layers.push(flagsToConfig(opts.flags, opts.flagMapping));
  }

  return mergeConfigs(layers) as ResolvedConfig;
}
