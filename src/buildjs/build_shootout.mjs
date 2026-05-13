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

function pluralize(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * Generate a stable anchor slug for a (library, machine) cell.
 *
 * Mirrors the format that GitHub/typedoc would produce from the heading
 * emitted by renderEntry: lowercase, non-alphanumeric runs collapsed to `-`,
 * leading/trailing `-` stripped.
 *
 * @param {object} entry - A validated entry from loadAll().entries.
 * @param {{ title: string }} machineMeta - The machines.json entry for entry.machine.
 * @returns {string} anchor slug (no leading `#`)
 *
 * @example
 * anchorFor({ library: { name: 'jssm' }, official: true, code: 'x' }, { title: 'Toggle machine' })
 * // => 'jssm-toggle-machine-1-line'
 */
function anchorFor(entry, machineMeta) {
  const prefix = entry.official ? '' : 'created-';
  const slug = `${prefix}${entry.library.name}-${machineMeta.title}-${pluralize(lineCount(entry.code), 'line')}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug;
}

/**
 * Format an average line count for the Avg column.
 *
 * Two decimal places, trailing zeros and trailing dot trimmed.
 * Returns `—` for non-finite values.
 *
 * @param {number} n
 * @returns {string}
 *
 * @example
 * formatAvg(2.666666) // => '2.67'
 * formatAvg(9)        // => '9'
 * formatAvg(Infinity) // => '—'
 */
function formatAvg(n) {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Render one (library, machine) entry as a markdown section.
 *
 * Heading format:
 *   ### `<lib>` <machineTitle>, N line[s]
 *   ### (created) `<lib>` <machineTitle>, N line[s]    // if !entry.official
 *
 * Followed by optional source note/url, then a fenced code block tagged with entry.language.
 *
 * @param {object} entry - A validated entry from loadAll().entries.
 * @param {{ title: string, blurb?: string }} machineMeta - The machines.json entry for entry.machine.
 * @returns {string} markdown
 */
export function renderEntry(entry, machineMeta) {
  const createdPrefix = entry.official ? '' : '(created) ';
  const heading = `### ${createdPrefix}\`${entry.library.name}\` ${machineMeta.title}, ${pluralize(lineCount(entry.code), 'line')}`;

  const parts = [heading, ''];

  if (entry.source?.note) parts.push(entry.source.note);
  if (entry.source?.url)  parts.push(`Source: <${entry.source.url}>`);
  if (entry.source?.note || entry.source?.url) parts.push('');

  parts.push('```' + entry.language);
  parts.push(entry.code);
  parts.push('```');

  return parts.join('\n');
}

/**
 * Render the top summary table (the `quicktab` span) of Shootout.md.
 *
 * One column per machine (using `machineMeta.title.split(' ')[0]` as a short
 * abbreviation), one row per library.  Libraries with no `canImplement:false`
 * cells are sorted first (ascending average line count); libraries with at
 * least one failing cell are sorted last (also ascending average).
 *
 * @param {object} machines - The machines.json object (insertion-ordered).
 * @param {Array<object>} entries - Validated entries from loadAll().
 * @returns {string} markdown block wrapped in `<span id="quicktab">...</span>`
 *
 * @example
 * const { machines, entries } = await loadAll();
 * const md = renderQuickTab(machines, entries);
 * // => '<span id="quicktab">\n\n| Library | Toggle | Traffic | States | Avg |\n...\n</span>'
 */
export function renderQuickTab(machines, entries) {
  const machineSlugs = Object.keys(machines);
  const libraries = [...new Set(entries.map(e => e.library.name))];

  const rows = libraries.map(libName => {
    const cells = machineSlugs.map(slug => entries.find(e => e.library.name === libName && e.machine === slug));
    const anyFail = cells.some(c => c && !c.canImplement);
    const nameCell = anyFail ? `<fail>${libName}</fail>` : libName;

    const counts = cells.map(c => {
      if (!c) return { text: '', value: null };
      const n = lineCount(c.code);
      const anchor = anchorFor(c, machines[c.machine]);
      const linked = c.official ? `**[${n}](#${anchor})**` : `[${n}](#${anchor})`;
      const wrapped = c.canImplement ? linked : `<fail>${linked}</fail>`;
      return { text: wrapped, value: n };
    });

    const knownValues = counts.filter(x => x.value !== null).map(x => x.value);
    const avg = knownValues.length ? (knownValues.reduce((a, b) => a + b, 0) / knownValues.length) : Infinity;
    const avgText = formatAvg(avg);
    const avgCell = anyFail ? `<fail>${avgText}</fail>` : avgText;

    return { libName, nameCell, counts, avg, anyFail, avgCell };
  });

  rows.sort((a, b) => {
    if (a.anyFail !== b.anyFail) return a.anyFail ? 1 : -1;
    return a.avg - b.avg;
  });

  const header  = `| Library | ${machineSlugs.map(s => machines[s].title.split(' ')[0]).join(' | ')} | Avg |`;
  const divider = `| ---- | ${machineSlugs.map(() => '----').join(' | ')} | ---- |`;
  const body    = rows.map(r => `| ${r.nameCell} | ${r.counts.map(c => c.text).join(' | ')} | ${r.avgCell} |`).join('\n');

  return [
    '<span id="quicktab">',
    '',
    header,
    divider,
    body,
    '',
    '</span>',
  ].join('\n');
}
