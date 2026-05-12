import { promises as fs } from 'fs';
import { join, extname } from 'path';

const IS_WINDOWS = process.platform === 'win32';
const PATH_SEP   = IS_WINDOWS ? ';' : ':';
const PATHEXT    = IS_WINDOWS
  ? (process.env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').map(s => s.toLowerCase())
  : [''];

/**
 * Look for a plugin binary on PATH.
 *
 * Searches each PATH directory in order. On Windows, also probes
 * `name.cmd`, `name.bat`, etc., per `PATHEXT`. Returns the first match.
 *
 * @param subcommand - The subcommand name (e.g., 'render'). The probed
 *   binary name is `fsl-<subcommand>`.
 * @param pathEnv - The PATH string to search (default `process.env.PATH`)
 * @returns Absolute path to the binary, or null if not found.
 *
 * @example
 * ```ts
 * const found = await findPluginOnPath('render', '/usr/local/bin:/usr/bin');
 * // found === '/usr/local/bin/fsl-render'  (if it exists)
 * // found === null                          (if not found)
 * ```
 */
export async function findPluginOnPath(
  subcommand: string,
  pathEnv: string | undefined = process.env.PATH,
): Promise<string | null> {
  if (!pathEnv) return null;
  const dirs = pathEnv.split(PATH_SEP).filter(d => d.length > 0);
  const baseName = `fsl-${subcommand}`;
  const exts = IS_WINDOWS ? PATHEXT : [''];

  for (const dir of dirs) {
    for (const ext of exts) {
      const candidate = join(dir, baseName + ext);
      try {
        const st = await fs.stat(candidate);
        if (st.isFile()) return candidate;
      } catch {
        // not found in this location, keep looking
      }
    }
  }
  return null;
}

/**
 * Decide whether a resolved plugin path is safe to load in-process via
 * dynamic `import()` rather than spawning as a subprocess.
 *
 * Heuristic for v1:
 *   - File extension is .js, .mjs, or .cjs
 *   - File path is inside a `node_modules` directory
 *
 * Anything else (shell scripts, non-JS files, files outside node_modules)
 * falls back to spawn.
 *
 * @param resolvedPath - Absolute path to the plugin binary
 * @returns true if in-process load is appropriate, false to use spawn
 *
 * @example
 * ```ts
 * isInProcessEligible('/proj/node_modules/.bin/fsl-render.cjs');
 * // true
 *
 * isInProcessEligible('/usr/local/bin/fsl-render');
 * // false  (no JS extension, outside node_modules)
 * ```
 */
export function isInProcessEligible(resolvedPath: string): boolean {
  const ext = extname(resolvedPath).toLowerCase();
  if (ext !== '.js' && ext !== '.mjs' && ext !== '.cjs') return false;
  const norm = resolvedPath.replace(/\\/g, '/');
  return norm.includes('/node_modules/');
}
