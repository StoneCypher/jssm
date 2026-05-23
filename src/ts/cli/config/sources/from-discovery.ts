/**
 * Discover the user-global and project-level config files.
 *
 * Two separately exported functions so non-CLI consumers (GitHub Actions,
 * editor plugins, SSGs) can pick which one(s) to call. The CLI's
 * `loadConfig` orchestrator calls both.
 *
 * Node-only — uses `fs` and `os`.
 */

import { access, constants } from 'fs/promises';
import { homedir } from 'os';
import { join, dirname, parse } from 'path';
import type { PartialConfig } from '../types';
import { loadConfigFile } from './from-file';

const CONFIG_BASENAME = join('.fsl', 'config.json');

/**
 * Check whether a path exists and is readable without throwing.
 *
 * @param path - Absolute path to test.
 * @returns `true` if the path is accessible for reading; `false` otherwise.
 */
const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path, constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Look for `~/.fsl/config.json` (or `<home>/.fsl/config.json` if `home`
 * is provided for testing).
 *
 * @param opts.home - Override the home directory (test seam). Defaults to `os.homedir()`.
 * @returns The parsed config, or `null` if the file does not exist.
 * @throws ConfigParseError / ConfigSchemaError / ConfigIOError if the file exists but is malformed.
 *
 * @example
 *   const userCfg = await discoverUserGlobalConfig();
 *   // null on a fresh machine, a PartialConfig if the user wrote one.
 *
 * @see discoverProjectConfig
 */
export async function discoverUserGlobalConfig(opts: { home?: string } = {}): Promise<PartialConfig | null> {
  const path = join(opts.home ?? homedir(), CONFIG_BASENAME);
  if (!(await exists(path))) return null;
  return loadConfigFile(path);
}

/**
 * Walk up from `from` looking for a directory containing `.fsl/config.json`.
 * Returns the first one found; null if none up to the filesystem root.
 *
 * @param opts.from - Directory to start walking from. Walks toward the filesystem root.
 * @returns The parsed config, or `null` if none exists in any ancestor.
 * @throws ConfigParseError / ConfigSchemaError / ConfigIOError if a file is found but malformed.
 *
 * @example
 *   const projCfg = await discoverProjectConfig({ from: process.cwd() });
 *   // { render: { defaultTarget: 'svg', scale: 3, quality: 85 }, ... }
 *
 * @see discoverUserGlobalConfig
 */
export async function discoverProjectConfig(opts: { from: string }): Promise<PartialConfig | null> {
  let cur = opts.from;
  const root = parse(cur).root;
  // Cap iterations defensively in case of symlink loops or weird filesystems.
  for (let i = 0; i < 64; i++) {
    const candidate = join(cur, CONFIG_BASENAME);
    if (await exists(candidate)) return loadConfigFile(candidate);
    if (cur === root) return null;
    const parent = dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
  return null;
}
