
/**
 * Build-time version stamper. Runs early in every build (stage 1, alongside
 * `peg` — see `build_config_features.cjs`): writes `src/ts/version.ts` from
 * the root `package.json`, then propagates that same lockstep version into
 * every `packages/*` workspace manifest — each package's own `version` field
 * plus every lockstep SIBLING dependency pin (`jssm-viz`, `jssm-fence`
 * entries in another package's `dependencies`). The `"jssm": "file:../.."`
 * root dependency is never touched; only Task 6's publisher rewrites that,
 * transiently, at publish time.
 *
 * This is what makes `/sc-commit`'s single root version bump reach the
 * workspace manifests automatically — there is no second bump mechanism.
 *
 * The workspace rewrite is a targeted text substitution, not a
 * JSON.parse/stringify round-trip: this repo's workspace manifests use a
 * compact, hand-formatted `dependencies` line (e.g.
 * `"dependencies": { "jssm": "file:../..", "jssm-viz": "6.0.0-alpha.12" }`)
 * that `JSON.stringify(_, null, 2)` would expand onto multiple lines,
 * reformatting the whole file on every run. Instead only the specific
 * `"version"` and sibling-pin string values are rewritten in place, so every
 * other byte — indentation, key order, single-line vs. multi-line layout,
 * trailing newline — survives untouched. When a manifest is already at the
 * target version, no write happens at all: idempotent, no gratuitous mtime
 * churn.
 *
 * `resolveWorkspaceDirNames`/`expandWorkspacePattern` below deliberately
 * duplicate `verify_version_bump.cjs`'s glob-expansion approach rather than
 * importing it: `src/buildjs/*.cjs` scripts are independent CLI entry
 * points and stay self-contained (confirmed by checking for cross-`require`s
 * among `src/buildjs/*.cjs` — the only ones found are within genuinely
 * single-system families, e.g. `run_build.cjs` → `build_config.cjs` →
 * `build_config_features.cjs`, or the `benchmark_scaling*` suite, each a
 * single orchestrator plus the sub-modules it owns. `makever.cjs` and
 * `verify_version_bump.cjs` are two unrelated, independently-invoked release
 * scripts — one a build-DAG stage, the other a separate CI job — so
 * duplicating this small resolver is the sanctioned pattern here, not an
 * exception to it). Unlike the release gate, an empty or absent
 * `workspaces` field just means "nothing to stamp"; but like the release
 * gate, a directory the glob DID resolve that lacks a manifest is a hard
 * error — a promised workspace package that's missing means a broken tree,
 * and skipping it silently would let the lockstep drift.
 *
 * @example
 * // Build DAG invocation (stage 1, package.json's "makever" script)
 * //   $ node src/buildjs/makever.cjs
 * //   (writes src/ts/version.ts; stamps any packages/* manifest not already
 * //    at the root version)
 *
 * @see src/buildjs/verify_version_bump.cjs   the release gate this duplicates the resolver from
 * @see src/buildjs/tests/makever_workspaces.spec.ts   unit coverage for the functions below
 */

'use strict';

const fs   = require('fs'),
      path = require('path');



/** Escapes a string for safe interpolation into a `RegExp` literal — defense in depth before a package name is matched as a literal JSON key. */
const escapeRegExp = (raw) => raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');



/**
 * Rewrites the first `"key_name": "..."` JSON string field found in a raw
 * text fragment, leaving every other byte untouched. Used instead of a full
 * JSON.parse/stringify round-trip so hand-formatted manifests keep their own
 * layout (see this file's module DocBlock).
 *
 * @param text - Raw JSON text fragment to search
 * @param key_name - The JSON key whose string value should be replaced (matched literally)
 * @param new_value - The replacement string value
 * @returns `text` with the first `"key_name": "..."` value replaced; `text` itself, unchanged, when `key_name` isn't present
 *
 * @example
 * replaceJsonStringField('{ "jssm-viz": "6.0.0" }', 'jssm-viz', '6.0.1');
 * // => '{ "jssm-viz": "6.0.1" }'
 */
const replaceJsonStringField = (text, key_name, new_value) => {

  const field_re = new RegExp(`("${escapeRegExp(key_name)}"\\s*:\\s*")[^"]*(")`);

  return field_re.test(text) ? text.replace(field_re, (_m, pre, post) => `${pre}${new_value}${post}`) : text;

};



/**
 * Finds the raw text span of a top-level JSON object member whose value is
 * itself an object (e.g. `"dependencies": { ... }`), by counting braces from
 * the member's opening `{` to its matching close. Holds for ordinary
 * `package.json` dependency maps, whose values are always plain strings.
 *
 * @param text - Raw JSON text to search
 * @param key_name - The object-valued key to locate (e.g. `'dependencies'`)
 * @returns `{ start, end }` character offsets (`end` exclusive, just past the closing `}`), or `null` when `key_name` isn't present as an object value
 * @throws {Error} when the key is found but its braces never balance — a malformed manifest, never a valid one
 *
 * @example
 * findObjectSpan('{"dependencies":{"a":"1"}}', 'dependencies'); // => { start: 16, end: 26 }
 */
const findObjectSpan = (text, key_name) => {

  const key_re    = new RegExp(`"${escapeRegExp(key_name)}"\\s*:\\s*\\{`),
        key_match = key_re.exec(text);

  if (!key_match) { return null; }

  const brace_start = text.indexOf('{', key_match.index);

  let depth = 0;

  for (let i = brace_start; i < text.length; i += 1) {

    if (text[i] === '{') { depth += 1; }
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) { return { start: brace_start, end: i + 1 }; }
    }

  }

  throw new Error(`unbalanced braces while locating "${key_name}" in manifest text`);

};



/**
 * Rewrites one workspace package manifest's raw `package.json` text in
 * memory: its own `version` field, plus every listed sibling's dependency
 * pin inside `dependencies` — never any other key, and never `"jssm"` (the
 * root package is not a workspace directory name, so it can never appear in
 * `sibling_names`, but the exclusion is asserted explicitly here too as
 * defense in depth around this invariant). Pure — no filesystem access.
 *
 * @param raw_text - The manifest's current raw file contents
 * @param root_version - The lockstep version this package (and its sibling pins) must match
 * @param sibling_names - Other workspace package names that might be pinned in this manifest's `dependencies` (this package's own name should already be excluded by the caller)
 * @returns The rewritten text, or `raw_text` itself when nothing needed to change
 *
 * @example
 * stampWorkspaceManifestText(
 *   '{\n  "name": "jssm-fence",\n  "version": "6.0.0-alpha.11",\n  "dependencies": { "jssm": "file:../..", "jssm-viz": "6.0.0-alpha.11" }\n}\n',
 *   '6.0.0-alpha.12',
 *   ['jssm-viz'],
 * );
 * // => '{\n  "name": "jssm-fence",\n  "version": "6.0.0-alpha.12",\n  "dependencies": { "jssm": "file:../..", "jssm-viz": "6.0.0-alpha.12" }\n}\n'
 */
const stampWorkspaceManifestText = (raw_text, root_version, sibling_names) => {

  let text = replaceJsonStringField(raw_text, 'version', root_version);

  const deps_span = findObjectSpan(text, 'dependencies');

  if (deps_span) {

    let deps_text = text.slice(deps_span.start, deps_span.end);

    for (const sibling_name of sibling_names) {
      if (sibling_name === 'jssm') { continue; }
      deps_text = replaceJsonStringField(deps_text, sibling_name, root_version);
    }

    text = text.slice(0, deps_span.start) + deps_text + text.slice(deps_span.end);

  }

  return text;

};



/** Reads real subdirectory names off disk; a missing base directory (no `packages/` yet) resolves to `[]` rather than throwing. */
const listRealDirNames = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
};



/**
 * Expands one `workspaces` glob pattern into directory names. Only the
 * trailing-`/*` form (e.g. `packages/*`, the sole pattern this repo uses)
 * needs a directory listing; a literal path resolves to its own basename
 * with no filesystem access. Mirrors `verify_version_bump.cjs`'s function of
 * the same name (duplicated by design — see this file's module DocBlock).
 *
 * @param pattern - One entry from package.json's `workspaces` array (e.g. `'packages/*'`)
 * @param list_dir_names - Given a directory path, returns the names of its subdirectories
 * @returns Directory/package names this pattern resolves to
 *
 * @example
 * expandWorkspacePattern('packages/*', (dir) => ['jssm-viz', 'jssm-cli']);
 * // => ['jssm-viz', 'jssm-cli']
 */
const expandWorkspacePattern = (pattern, list_dir_names) => {
  if (!pattern.endsWith('/*')) { return [pattern.split('/').pop()]; }
  return list_dir_names(pattern.slice(0, -2));
};



/**
 * Resolves the on-disk workspace package directory names declared by the
 * root manifest's `workspaces` field. Unlike `verify_version_bump.cjs`'s
 * `resolveWorkspaceDirNames` (which this mirrors), an absent field or a
 * glob that resolves to nothing on disk is not an error here — it just
 * means there is nothing to stamp yet.
 *
 * @param root_pkg - Parsed root package.json
 * @param list_dir_names - Given a directory path, returns the names of its subdirectories (defaults to a real fs read)
 * @returns Workspace package directory names, sorted; `[]` when `workspaces` is absent or resolves to nothing on disk
 *
 * @example
 * resolveWorkspaceDirNames({ workspaces: ['packages/*'] }, () => ['jssm-viz', 'jssm-fence', 'jssm-cli']);
 * // => ['jssm-cli', 'jssm-fence', 'jssm-viz']
 */
const resolveWorkspaceDirNames = (root_pkg, list_dir_names = listRealDirNames) => {

  if (!root_pkg.workspaces) { return []; }

  const patterns = Array.isArray(root_pkg.workspaces) ? root_pkg.workspaces : (root_pkg.workspaces.packages ?? []),
        names     = new Set();

  for (const pattern of patterns) {
    for (const name of expandWorkspacePattern(pattern, list_dir_names)) { names.add(name); }
  }

  return [...names].sort();

};



/**
 * Stamps one workspace package's `package.json` in place: rewrites its
 * `version` field and every listed sibling's dependency pin to
 * `root_version`. Idempotent — when the computed text is identical to what's
 * already on disk, nothing is written, so a second run leaves the file's
 * mtime alone.
 *
 * @param manifest_path - Path to the workspace package's package.json
 * @param root_version - The lockstep version to stamp
 * @param sibling_names - Other workspace package names that might be pinned in this manifest's `dependencies`
 * @returns Whether the file was written (`false` means it already matched)
 * @throws {Error} when `manifest_path` can't be read, or when the stamped
 *   text does not re-parse to a manifest whose `version` equals
 *   `root_version` — which covers both a malformed rewrite and a manifest
 *   with no top-level `version` field at all (the text replace silently
 *   matches nothing in that case, so this assert runs unconditionally,
 *   BEFORE the no-change short-circuit, and can never be bypassed by it)
 *
 * @example
 * stampWorkspaceManifest('packages/jssm-fence/package.json', '6.0.1', ['jssm-viz']);
 * // => true (if the file needed updating), false if already at 6.0.1
 */
const stampWorkspaceManifest = (manifest_path, root_version, sibling_names) => {

  const raw_text = fs.readFileSync(manifest_path, 'utf8'),
        new_text = stampWorkspaceManifestText(raw_text, root_version, sibling_names);

  let reparsed;

  try {
    reparsed = JSON.parse(new_text);
  } catch (e) {
    throw new Error(`makever: stamping ${manifest_path} produced invalid JSON`, { cause: e });
  }

  if (reparsed.version !== root_version) {
    throw new Error(`makever: ${manifest_path} has no top-level "version" field holding ${root_version} after stamping — the manifest is missing its version field, or the stamp failed; refusing to proceed silently`);
  }

  if (new_text === raw_text) { return false; }

  fs.writeFileSync(manifest_path, new_text);

  return true;

};



/**
 * Stamps every on-disk workspace package manifest under `packages/*` with
 * the root package's lockstep version — each package's own `version` field
 * plus its sibling dependency pins — leaving the `"jssm": "file:../.."` root
 * dependency untouched. This is what lets `/sc-commit`'s single root version
 * bump reach the workspace manifests with no second bump mechanism.
 *
 * @param root_pkg - Parsed root package.json; its `version` and `workspaces` fields drive the stamp
 * @param options.cwd - Directory `packages/*` is resolved against (defaults to the process's cwd; overridable for tests)
 * @returns Relative paths of manifests that were actually rewritten, built
 *   with `path.join` so the separator is platform-native (`packages\\<name>\\package.json`
 *   on Windows, `packages/<name>/package.json` on POSIX); `[]` when the tree
 *   is already lockstep
 * @throws {Error} when a directory the `workspaces` glob resolved to has no
 *   `package.json` — the glob promised a workspace package, so a missing
 *   manifest is a broken tree, never something to skip silently
 *
 * @example
 * stampWorkspaceManifests({ version: '6.0.1', workspaces: ['packages/*'] });
 * // => [path.join('packages', 'jssm-viz', 'package.json')] (only the files that needed a bump)
 */
const stampWorkspaceManifests = (root_pkg, { cwd = process.cwd() } = {}) => {

  const list_dir_names  = (dir) => listRealDirNames(path.join(cwd, dir)),
        workspace_names = resolveWorkspaceDirNames(root_pkg, list_dir_names),
        stamped         = [];

  for (const name of workspace_names) {

    const relative_path = path.join('packages', name, 'package.json'),
          manifest_path  = path.join(cwd, relative_path);

    if (!fs.existsSync(manifest_path)) {
      throw new Error(`makever: workspace directory "${name}" was resolved from the workspaces glob but has no manifest at ${manifest_path} — a promised workspace package is missing, refusing to skip it silently`);
    }

    const sibling_names = workspace_names.filter((n) => n !== name && n !== 'jssm');

    if (stampWorkspaceManifest(manifest_path, root_pkg.version, sibling_names)) {
      stamped.push(relative_path);
    }

  }

  return stamped;

};



/** Writes `src/ts/version.ts` from the root manifest's version and the current build time. */
const writeVersionFile = (pkg) => {

  fs.writeFileSync('./src/ts/version.ts', `
/**
 *  The published semantic version of the jssm package this build was cut from.
 *  Mirrored from \`package.json\` by \`src/buildjs/makever.cjs\` at build time.
 *  Useful for runtime diagnostics and for embedding in serialized machine
 *  snapshots so that deserializers can detect version-skew.
 */
const version    : string = "${pkg.version}";

/**
 *  The Unix epoch timestamp (in milliseconds) at which this build was produced,
 *  written by \`src/buildjs/makever.cjs\`.  Useful for distinguishing builds
 *  with the same \`version\` string during development, and for diagnostic logs.
 */
const build_time : number = ${new Date().getTime()};

export { version, build_time };
`);

};



/** CLI entry point: writes `src/ts/version.ts`, stamps every workspace manifest to the root's lockstep version, and logs one line naming what (if anything) was stamped, for build-log auditability. */
const main = () => {

  const pkg = JSON.parse(fs.readFileSync('package.json'));

  writeVersionFile(pkg);

  const stamped = stampWorkspaceManifests(pkg);

  if (stamped.length > 0) {
    console.log(`makever: stamped ${pkg.version} into ${stamped.join(', ')}`);
  } else {
    console.log(`makever: workspace manifests already at lockstep ${pkg.version}`);
  }

};



if (require.main === module) { main(); }

module.exports = {
  escapeRegExp,
  replaceJsonStringField,
  findObjectSpan,
  stampWorkspaceManifestText,
  listRealDirNames,
  expandWorkspacePattern,
  resolveWorkspaceDirNames,
  stampWorkspaceManifest,
  stampWorkspaceManifests,
  writeVersionFile,
};
