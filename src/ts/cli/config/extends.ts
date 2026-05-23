/**
 * Resolve a `PartialConfig`'s `extends` chain into a single merged
 * `PartialConfig`. Pure module — takes a `Reader` callback so the same
 * logic serves Node (`fs.readFile`) and browser (`fetch`).
 *
 * Resolution rules (per the design spec):
 *   - paths relative to the file containing the extends
 *   - cycle detection via the recursion stack
 *   - depth limit: 32 nested extends
 *   - merge order: bases resolve bottom-up first; the file's own keys merge last
 *   - array form: bases merge in order before the file's own keys
 */

import type { PartialConfig, Reader } from './types';
import { ConfigExtendsError, ConfigParseError } from './types';
import { mergeConfigs } from './merge';
import { validateConfig } from './schema';

const MAX_DEPTH = 32;

/**
 * Return the directory portion of a file path.
 * Cross-platform-safe; handles both POSIX `/` and Windows `\` separators.
 *
 * @param path - An absolute or relative file path.
 * @returns The directory containing `path`, or `'.'` if no separator is found.
 *
 * @example
 *   dirnameOf('/p/.fsl/config.json'); // '/p/.fsl'
 *   dirnameOf('/p/.fsl');             // '/p'
 */
const dirnameOf = (path: string): string => {
  const ix = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return ix === -1 ? '.' : path.slice(0, ix);
};

/**
 * Resolve `rel` relative to the directory `dir`, normalising `.` and `..`
 * segments. Returns `rel` unchanged if it looks absolute.
 *
 * @param dir - Base directory (e.g. from `dirnameOf`).
 * @param rel - Relative (or absolute) path to resolve.
 * @returns The resolved absolute-style path.
 *
 * @example
 *   joinPath('/p', './base.json');           // '/p/base.json'
 *   joinPath('/p', '../sibling/x.json');     // '/sibling/x.json'
 */
const joinPath = (dir: string, rel: string): string => {
  // If `rel` looks absolute (POSIX `/` or Windows `X:\`), return as-is.
  if (/^([a-zA-Z]:)?[/\\]/.test(rel)) return rel;
  const parts = (dir + '/' + rel).split(/[/\\]+/);
  const out: string[] = [];
  for (const p of parts) {
    if (p === '.' || p === '') continue;
    if (p === '..') out.pop();
    else out.push(p);
  }
  const prefix = /^[a-zA-Z]:/.test(parts[0] ?? '') ? '' : '/';
  return prefix + out.join('/');
};

/**
 * Return a shallow copy of `obj` with `key` removed.
 *
 * @param obj - Source object.
 * @param key - Key to omit.
 * @returns A new object with all keys from `obj` except `key`.
 *
 * @example
 *   omitKey({ a: 1, b: 2 }, 'b'); // { a: 1 }
 */
const omitKey = <T extends Record<string, unknown>>(obj: T, key: string): T => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) if (k !== key) out[k] = obj[k];
  return out as T;
};

/**
 * Resolve `raw.extends` into the fully merged effective config.
 *
 * Each base file is read via the injected `reader`, parsed, schema-validated,
 * and then recursively resolved before being merged. The merge order is
 * lowest-precedence-first: each base is merged before the file that extends it,
 * and the file's own keys win over all bases.
 *
 * @param raw - The parsed config object (may or may not have `extends`).
 * @param basePath - Absolute path of the file `raw` came from; extends paths
 *   resolve relative to its dirname.
 * @param reader - Async function that turns a path into the file's text.
 *   The CLI passes `fs.readFile`; a browser integration would pass a `fetch`
 *   wrapper.
 * @param visited - Internal recursion stack used for cycle detection. Callers
 *   should omit this parameter; it is managed by the recursive calls.
 * @returns The merged config, with the `extends` key stripped.
 * @throws ConfigExtendsError on cycle or depth overrun.
 * @throws ConfigParseError if a base file is malformed JSON.
 * @throws ConfigSchemaError if a base file violates the schema.
 *
 * @see mergeConfigs
 * @see validateConfig
 *
 * @example
 *   const cfg = await resolveExtends(parsed, '/p/.fsl/config.json', fsReader);
 */
export async function resolveExtends(
  raw: PartialConfig,
  basePath: string,
  reader: Reader,
  visited: ReadonlyArray<string> = [],
): Promise<PartialConfig> {
  if (visited.includes(basePath)) {
    throw new ConfigExtendsError(
      `extends cycle detected: ${[...visited, basePath].join(' -> ')}`,
      { path: basePath, chain: [...visited, basePath] },
    );
  }
  if (visited.length >= MAX_DEPTH) {
    throw new ConfigExtendsError(
      `extends depth ${MAX_DEPTH} exceeded`,
      { path: basePath, chain: [...visited, basePath] },
    );
  }

  if (!raw.extends) {
    return omitKey(raw as Record<string, unknown>, 'extends') as PartialConfig;
  }

  const extendsList = typeof raw.extends === 'string' ? [raw.extends] : raw.extends;
  const baseDir = dirnameOf(basePath);
  const nextVisited = [...visited, basePath];

  const bases: PartialConfig[] = [];
  for (const rel of extendsList) {
    const absPath = joinPath(baseDir, rel);
    const text = await reader(absPath);
    let parsed: PartialConfig;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      throw new ConfigParseError(`malformed JSON in ${absPath}: ${(e as Error).message}`, { path: absPath });
    }
    // Every parsed file (including recursive bases) must satisfy the schema.
    // The top-level caller (from-file.ts) validates the entry point; this
    // line validates every base reached via the extends chain.
    validateConfig(parsed, { path: absPath });
    const resolved = await resolveExtends(parsed, absPath, reader, nextVisited);
    bases.push(resolved);
  }

  const ownKeys = omitKey(raw as Record<string, unknown>, 'extends') as PartialConfig;
  return mergeConfigs([...bases, ownKeys]);
}
