import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const defaultComparablesDir = path.join(repoRoot, 'src', 'comparables');

export const START_MARKER = '<!-- COMPARABLES:GENERATED-START';
export const END_MARKER   = '<!-- COMPARABLES:GENERATED-END -->';

/**
 * Load and validate all per-library JSON files plus machines.json.
 *
 * @param {string} dir - The comparables directory. Defaults to <repo>/src/comparables.
 * @returns {Promise<{ machines: object, entries: Array<object> }>}
 *   `machines`: the machines.json object (insertion-ordered).
 *   `entries`: each loaded per-library file with `filePath` and `fileName` added.
 */
export async function loadAll(dir = defaultComparablesDir) {
  const schema   = JSON.parse(await readFile(path.join(dir, 'schema.json'), 'utf8'));
  const machines = JSON.parse(await readFile(path.join(dir, 'machines.json'), 'utf8'));

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const entries = [];
  for (const machineSlug of Object.keys(machines)) {
    const machineDir = path.join(dir, machineSlug);
    let files;
    try {
      files = await readdir(machineDir);
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      throw err;
    }
    for (const file of files.filter(f => f.endsWith('.json'))) {
      const filePath = path.join(machineDir, file);
      const data = JSON.parse(await readFile(filePath, 'utf8'));

      if (!validate(data)) {
        throw new Error(`Schema failure in ${filePath}: ${ajv.errorsText(validate.errors)}`);
      }
      if (data.machine !== machineSlug) {
        throw new Error(`${filePath}: machine field "${data.machine}" does not match directory "${machineSlug}"`);
      }
      if (!data.library.languages.includes(data.language)) {
        throw new Error(`${filePath}: language "${data.language}" not in library.languages [${data.library.languages.join(', ')}]`);
      }

      entries.push({ ...data, filePath, fileName: file });
    }
  }

  return { machines, entries };
}

/**
 * Count newline-separated lines in a code body.
 * Authoritative way to derive the displayed line count for table cells and headings.
 *
 * @param {string} code
 * @returns {number}
 */
export function lineCount(code) {
  return code.split('\n').length;
}
