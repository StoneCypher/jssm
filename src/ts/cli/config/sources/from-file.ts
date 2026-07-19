/**
 * Filesystem-backed config file loader. Wraps `resolveExtends` with
 * `fs.readFile` as the reader, runs schema validation, returns the
 * fully-merged `PartialConfig`.
 *
 * Node-only — uses `fs/promises`.
 */

import { readFile } from 'node:fs/promises';
import type { PartialConfig, Reader } from '../types';
import { ConfigIOError, ConfigParseError } from '../types';
import { resolveExtends } from '../extends';
import { validateConfig } from '../schema';

/**
 * Injected `Reader` that wraps `fs.readFile`. Converts Node
 * `ErrnoException` into a `ConfigIOError` so callers receive a typed,
 * domain-specific error rather than a raw Node system error.
 * @param path - Absolute or cwd-relative path to read.
 * @returns The file's UTF-8 text contents.
 * @throws ConfigIOError if the file cannot be read (e.g. ENOENT, EACCES).
 */
const fsReader: Reader = async (path: string) => {
  try {
    return await readFile(path, 'utf8');
  } catch (error) {
    const errno = error as NodeJS.ErrnoException;
    throw new ConfigIOError(`cannot read config file ${path}: ${errno.message}`, {
      path,
      errno,
    });
  }
};

/**
 * Read, parse, validate, and resolve the extends chain of one config file.
 * @param path - Absolute or cwd-relative path to a config file.
 * @returns The fully-merged `PartialConfig` (with `extends` and `$schema` stripped).
 * @throws ConfigIOError if the file cannot be read.
 * @throws ConfigParseError if the file is not valid JSON.
 * @throws ConfigSchemaError if the parsed object violates the schema.
 * @throws ConfigExtendsError on cycle or depth overrun.
 * @example
 *   const cfg = await loadConfigFile('/project/.fsl/config.json');
 *   // { render: { scale: 4, ... } }
 * @see resolveExtends
 * @see validateConfig
 */
export async function loadConfigFile(path: string): Promise<PartialConfig> {
  const text = await fsReader(path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new ConfigParseError(`malformed JSON in ${path}: ${(error as Error).message}`, { path });
  }
  validateConfig(parsed, { path });
  const resolved = await resolveExtends(parsed, path, fsReader);
  // Strip $schema if present — it's purely an editor-autocomplete hint.
  const out: Record<string, unknown> = { ...(resolved as Record<string, unknown>) };
  delete out.$schema;
  return out;
}
