'use strict';

/**
 * Dependency-ordered workspace publisher (fsl#1969). The v6 monorepo ships
 * four npm packages from one repo — `jssm` (root) plus the `packages/*`
 * workspace members `jssm-viz`, `jssm-fence`, `jssm-cli` — and each member
 * depends on the ones before it in {@link PUBLISH_ORDER}. This script
 * publishes them one at a time, in that fixed order, so a consumer installing
 * a just-published package never resolves to a sibling that isn't on the
 * registry yet.
 *
 * Every member manifest carries `"jssm": "file:../.."` in its `dependencies`
 * — the convenience form that makes local `npm install` link straight to the
 * repo root instead of waiting on a registry round-trip (see Task 2/5 of the
 * v6 monorepo migration; `src/buildjs/makever.cjs` maintains every OTHER
 * lockstep pin but deliberately never touches this one). A `file:` dependency
 * published to the registry verbatim would be broken for every real installer
 * (there is no `../..` relative to a consumer's node_modules), so before
 * publishing each member this script transiently rewrites that one line to
 * the exact lockstep version, publishes, and restores the `file:../..` form
 * in a `finally` — atomic per package: a crash mid-publish (a thrown error,
 * not a killed process) still leaves the manifest exactly as it found it.
 * If the restore write itself fails, both failures are logged and surfaced
 * together, naming the manifest as needing manual recovery — a restore
 * failure never silently swallows the publish failure (see
 * {@link publishMember}).
 *
 * Per-package idempotency guard: before touching anything, `npm view
 * <name>@<version> version` asks the registry whether this EXACT version is
 * already published. If it is, the package is skipped — safe to re-run the
 * whole script after a partial failure, since already-shipped packages are
 * never re-attempted. An unpublished-version lookup surfaces as one of two
 * npm error shapes depending on whether the package itself has ever shipped:
 * `E404` (the package name has never been published — true today for
 * `jssm-viz`/`jssm-fence`/`jssm-cli`, which are new in v6) or `ETARGET`/"No
 * matching version found" (the package exists, but not at this exact
 * version — true for `jssm` itself, which has published 5.x for years and
 * only lacks THIS release). {@link isUnpublishedVersionError} recognizes
 * both; treating only E404 as "not yet published" (as the sibling
 * `verify_version_bump.cjs` gate does, correctly, for its own "any published
 * version" check) would make `jssm`'s own guard misfire as a hard failure on
 * every release.
 *
 * `--dry-run` passes straight through to every `npm publish` call (adding
 * npm's own `--dry-run`, which uploads nothing — see npm's publish docs) so
 * the WHOLE rewrite-publish-restore path is rehearsed for real, including the
 * manifest surgery, with nothing ever reaching the registry. The skip-guard's
 * `npm view` is a read-only registry lookup and always runs live, dry-run or
 * not, so the rehearsal reports real skip/publish decisions.
 *
 * `npm publish` is invoked with `--provenance --access public`, bare for the
 * root package (cwd is the repo root) and with `-w <name>` for each member
 * (also run from the repo root, rather than `cd`-ing into `packages/<name>`):
 * npm's workspace filtering already resolves `-w` to the right package
 * directory and packs/provenance-attests it correctly, so there is no need to
 * change the process's working directory per package — one invocation shape
 * for all four packages, root included, keeps the loop uniform and avoids
 * relative-path bugs across POSIX/Windows.
 *
 * @example
 * // CI's actual invocation (.github/workflows/nodejs.yml, release job)
 * //   $ node src/scripts/publish_workspaces.cjs
 * //   publish: jssm@6.0.0-alpha.12
 * //   ok: jssm@6.0.0-alpha.12 published
 * //   jssm-viz: rewriting jssm dependency to 6.0.0-alpha.12 for publish
 * //   ...
 *
 * @example
 * // local rehearsal: same decisions, no network write
 * //   $ node src/scripts/publish_workspaces.cjs --dry-run
 *
 * @see src/buildjs/verify_version_bump.cjs   the release gate this mirrors the npm-subprocess style of
 * @see src/buildjs/makever.cjs               the text-surgery rewrite technique this mirrors (never touches the file: dep itself)
 * @see src/scripts/tests/publish_workspaces.spec.ts   unit coverage for the pure functions below
 */

const { execFileSync } = require('child_process'),
      fs               = require('fs'),
      path             = require('path');



/** Publish order: root first, then each workspace member in dependency order (each depends only on names earlier in this list). */
const PUBLISH_ORDER = Object.freeze(['jssm', 'jssm-viz', 'jssm-fence', 'jssm-cli']);

/** On Windows, `npm` resolves to a `.cmd` shim; Node refuses to spawn `.cmd`/`.bat` files without a shell (the CVE-2024-27980 hardening), so that platform needs `NPM_NEEDS_SHELL` below. POSIX's real `npm` binary needs neither. Mirrors `verify_version_bump.cjs`. */
const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/** Whether an `npm` spawn must run through a shell — true only on Windows, where CI never runs (CI is ubuntu-latest), so the shell path is exercised only by local smoke runs. */
const NPM_NEEDS_SHELL = process.platform === 'win32';

/** A conservative match for valid npm package names (plain or scoped), checked before any name is interpolated into a shell command — defense in depth for {@link NPM_NEEDS_SHELL}. Mirrors `verify_version_bump.cjs`. */
const SAFE_NPM_NAME = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i;



// ---------------------------------------------------------------------------
// Manifest paths
// ---------------------------------------------------------------------------

/**
 * Resolves one package's `package.json` path. The root package (`jssm`)
 * lives at the repo root; every other name is a `packages/*` workspace
 * member.
 *
 * @param name - A {@link PUBLISH_ORDER} entry
 * @returns The manifest path, relative to the repo root (the assumed cwd)
 *
 * @example
 * manifestPathFor('jssm');     // => './package.json'
 * manifestPathFor('jssm-viz'); // => 'packages/jssm-viz/package.json'
 */
const manifestPathFor = (name) => (name === 'jssm' ? './package.json' : path.join('packages', name, 'package.json'));



/**
 * Reads and parses one package.json off disk.
 *
 * @param manifest_path - Path to the manifest
 * @returns The parsed manifest
 * @throws {Error} when the file is missing or is not valid JSON
 */
const readManifest = (manifest_path) => {
  try {
    return JSON.parse(fs.readFileSync(manifest_path, 'utf8'));
  } catch (e) {
    throw new Error(`could not read/parse manifest at ${manifest_path}`, { cause: e });
  }
};



/**
 * Resolves every package this run publishes, in {@link PUBLISH_ORDER}: reads
 * each one's own manifest for its current version, and sanity-checks that the
 * manifest's declared `name` actually matches the slot it was found in (a
 * mismatch means the workspace tree is not shaped the way this script
 * assumes, and must never be silently published under the wrong identity).
 *
 * @returns One `{ name, version }` per package, in publish order
 * @throws {Error} when a manifest is unreadable, or its `name` field disagrees with its expected slot
 */
const resolvePackages = () => PUBLISH_ORDER.map((name) => {

  const manifest_path = manifestPathFor(name),
        manifest      = readManifest(manifest_path);

  if (manifest.name !== name) {
    throw new Error(`${manifest_path}: manifest name "${manifest.name}" does not match the expected package "${name}"`);
  }

  return { name, version: manifest.version };

});



// ---------------------------------------------------------------------------
// Pure: rewrite/restore text transform (no fs, no JSON.stringify round-trip)
// ---------------------------------------------------------------------------

/** Escapes a string for safe interpolation into a `RegExp` literal — defense in depth before a key name is matched literally. */
const escapeRegExp = (raw) => raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');



/**
 * Rewrites the first `"key_name": "..."` JSON string field found in a raw
 * text fragment, leaving every other byte untouched. Used instead of a full
 * JSON.parse/stringify round-trip so the hand-formatted, compact
 * `dependencies` line in every workspace manifest keeps its own layout.
 * Mirrors `makever.cjs`'s function of the same name (duplicated by design —
 * `src/buildjs` and `src/scripts` are independent, self-contained CLI entry
 * points; see that file's module DocBlock for the "why duplicate, not
 * import" reasoning, which applies identically here).
 *
 * @param text - Raw JSON text fragment to search
 * @param key_name - The JSON key whose string value should be replaced (matched literally)
 * @param new_value - The replacement string value
 * @returns `text` with the first `"key_name": "..."` value replaced; `text` itself, unchanged, when `key_name` isn't present
 *
 * @example
 * replaceJsonStringField('{ "jssm": "file:../.." }', 'jssm', '6.0.1');
 * // => '{ "jssm": "6.0.1" }'
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
 * Mirrors `makever.cjs`'s function of the same name.
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
 * Rewrites one dependency's pinned value inside a manifest's `dependencies`
 * object, scoped so it can never touch a same-named key anywhere else in the
 * file (`devDependencies`, `peerDependencies`, ...). This single function
 * drives BOTH directions of the publish transiently-rewrite-then-restore
 * dance: called with the exact lockstep version as `new_value` it produces
 * the publishable manifest; called again with `'file:../..'` as `new_value`
 * it reconstructs the original working-tree manifest byte-for-byte (proven
 * by this file's round-trip tests) — restoring is just rewriting toward a
 * different target value. Pure — no filesystem access.
 *
 * @param raw_text - The manifest's current raw file contents
 * @param dep_name - The dependency key to rewrite (always `'jssm'` in this script's actual use)
 * @param new_value - The replacement value (an exact version, or `'file:../..'` to restore)
 * @returns The rewritten text, or `raw_text` itself when `dep_name` isn't present in `dependencies`
 *
 * @example
 * rewriteDependencyValue(
 *   '{ "dependencies": { "jssm": "file:../.." } }',
 *   'jssm', '6.0.0-alpha.12',
 * );
 * // => '{ "dependencies": { "jssm": "6.0.0-alpha.12" } }'
 */
const rewriteDependencyValue = (raw_text, dep_name, new_value) => {

  const deps_span = findObjectSpan(raw_text, 'dependencies');

  if (!deps_span) { return raw_text; }

  const deps_text           = raw_text.slice(deps_span.start, deps_span.end),
        rewritten_deps_text = replaceJsonStringField(deps_text, dep_name, new_value);

  if (rewritten_deps_text === deps_text) { return raw_text; }

  return raw_text.slice(0, deps_span.start) + rewritten_deps_text + raw_text.slice(deps_span.end);

};



// ---------------------------------------------------------------------------
// Pure: publish planning
// ---------------------------------------------------------------------------

/**
 * Decides, for each package in publish order, whether to publish or skip it
 * — pure: takes an injected `isPublished` decision instead of calling npm
 * itself, so the ordering/skip/all-skip logic is testable with no network
 * call and no child_process.
 *
 * @param packages - Ordered packages to plan, each `{ name, version }` (see {@link resolvePackages})
 * @param isPublished - Given one `{ name, version }`, returns whether that EXACT version is already on the registry
 * @returns One plan entry per input package, same order: `{ name, version, action: 'skip'|'publish', reason }`
 *
 * @example
 * planPublishes(
 *   [{ name: 'jssm', version: '6.0.1' }, { name: 'jssm-viz', version: '6.0.1' }],
 *   ({ name }) => name === 'jssm',
 * );
 * // => [
 * //   { name: 'jssm',     version: '6.0.1', action: 'skip',    reason: 'jssm@6.0.1 already published; skipping' },
 * //   { name: 'jssm-viz', version: '6.0.1', action: 'publish', reason: 'jssm-viz@6.0.1 not yet published' },
 * // ]
 */
const planPublishes = (packages, isPublished) => packages.map(({ name, version }) => {

  if (isPublished({ name, version })) {
    return { name, version, action: 'skip', reason: `${name}@${version} already published; skipping` };
  }

  return { name, version, action: 'publish', reason: `${name}@${version} not yet published` };

});



/**
 * Whether an entire publish plan needs no work at all — every package is
 * already at its published version. Lets the caller short-circuit (print one
 * summary line, exit 0) instead of walking a plan that would just log four
 * individual skips.
 *
 * @param plan - A {@link planPublishes} result (or any array of `{ action }` entries)
 * @returns true when every entry's `action` is `'skip'` (vacuously true for an empty plan)
 *
 * @example
 * allSkipped([{ action: 'skip' }, { action: 'skip' }]); // => true
 * @example
 * allSkipped([{ action: 'skip' }, { action: 'publish' }]); // => false
 */
const allSkipped = (plan) => plan.every((entry) => entry.action === 'skip');



// ---------------------------------------------------------------------------
// Impure: npm subprocess plumbing
// ---------------------------------------------------------------------------

/**
 * Recognizes an `npm view <name>@<version>` failure as "this exact version
 * is not published" rather than a real error. Covers BOTH shapes npm can
 * return for that: `E404` (the package name itself has never been
 * published) and `ETARGET`/"No matching version found" (the package exists,
 * but not at this specific version — the shape `jssm` itself will hit on
 * every release, since it has shipped 5.x for years). Any other failure
 * (auth, network, registry outage) must never be read as "safe to publish".
 *
 * @param stderr_text - Combined stderr (or error message) from a failed `npm view`
 * @returns true when the failure means "this version isn't published yet", false for any other failure
 *
 * @example
 * isUnpublishedVersionError('npm error code E404\nnpm error 404 Not Found'); // => true
 * @example
 * isUnpublishedVersionError('npm error code ETARGET\nnpm error notarget No matching version found for jssm@6.0.0.'); // => true
 * @example
 * isUnpublishedVersionError('npm error code ETIMEDOUT'); // => false
 */
const isUnpublishedVersionError = (stderr_text) =>
  /E404/.test(stderr_text) ||
  /is not in (the|this) (npm )?registry/i.test(stderr_text) ||
  /ETARGET/.test(stderr_text) ||
  /No matching version found/i.test(stderr_text);



/**
 * Looks up whether one package is already published at one EXACT version —
 * the per-package idempotency guard. A "not found" result (either shape
 * {@link isUnpublishedVersionError} recognizes) is a normal, expected
 * outcome — `false` — never an exception; any other failure is thrown so a
 * flaky lookup can never be silently read as "safe to publish".
 *
 * @param name - The npm package name to look up
 * @param version - The exact version to check for
 * @returns true when `name@version` is already on the registry
 * @throws {Error} when `npm view` fails for any reason other than "this version isn't there"
 *
 * @example
 * isVersionPublished('jssm', '5.163.4'); // => true (long since released)
 */
const isVersionPublished = (name, version) => {

  if (!SAFE_NPM_NAME.test(name)) {
    throw new Error(`refusing to look up unsafe-looking package name "${name}"`);
  }

  try {
    execFileSync(NPM_BIN, ['view', `${name}@${version}`, 'version'], {
      shell       : NPM_NEEDS_SHELL,
      stdio       : ['ignore', 'pipe', 'pipe'],
      windowsHide : true,
    });
    return true;
  } catch (e) {

    const stderr = (e.stderr ?? '').toString() || (e.message ?? '');

    if (isUnpublishedVersionError(stderr)) {
      return false;
    }

    throw new Error(`npm view ${name}@${version} failed:\n${stderr}`, { cause: e });

  }

};



/**
 * Builds the `npm publish` argv for one package — pure, so the root-vs-member
 * and dry-run shaping is unit-testable without spawning anything.
 *
 * @param name - A {@link PUBLISH_ORDER} entry
 * @param dry_run - When true, appends npm's own `--dry-run` (uploads nothing)
 * @returns The argv array for `execFileSync(NPM_BIN, argv, ...)`
 *
 * @example
 * buildPublishArgs('jssm', false);     // => ['publish', '--provenance', '--access', 'public']
 * @example
 * buildPublishArgs('jssm-viz', true);  // => ['publish', '--provenance', '--access', 'public', '-w', 'jssm-viz', '--dry-run']
 */
const buildPublishArgs = (name, dry_run) => {

  const args = ['publish', '--provenance', '--access', 'public'];

  if (name !== 'jssm') { args.push('-w', name); }
  if (dry_run) { args.push('--dry-run'); }

  return args;

};



/**
 * Runs one `npm publish` invocation, streaming npm's own output straight to
 * this process's stdio (`inherit`) — including the `--dry-run` tarball
 * contents/size listing — rather than capturing it, since there is nothing
 * this script needs to parse out of a successful publish.
 *
 * @param args - Argv from {@link buildPublishArgs}
 * @throws {Error} when the `npm publish` process fails to start or exits non-zero
 */
const runNpmPublish = (args) => {
  try {
    execFileSync(NPM_BIN, args, { shell: NPM_NEEDS_SHELL, stdio: 'inherit', windowsHide: true });
  } catch (e) {
    throw new Error(`npm ${args.join(' ')} failed`, { cause: e });
  }
};



/**
 * Publishes the root `jssm` package bare — no manifest rewrite, since the
 * root package has no `file:` self-dependency to swap.
 *
 * @param dry_run - Passed through to {@link buildPublishArgs}
 */
const publishRoot = (dry_run) => {
  runNpmPublish(buildPublishArgs('jssm', dry_run));
};



/**
 * Publishes one workspace member: transiently rewrites its `"jssm":
 * "file:../.."` dependency to the exact lockstep version, publishes, and
 * restores the manifest's original bytes in a `finally` — so the
 * working-tree manifest is back to its pre-publish state whether the
 * publish succeeded or threw, and a caller can always re-run this safely.
 *
 * If the restore write ITSELF fails (a genuine double fault — a disk error
 * at the worst possible moment), the restore failure must not silently
 * replace the publish failure: both are logged, the manifest is named as
 * possibly left rewritten and needing manual recovery, and a single error
 * propagates carrying both underlying errors on its `cause`
 * (`cause.publish_error` / `cause.restore_error`). When the publish itself
 * had succeeded and only the restore failed, the propagated error carries
 * just the restore failure as its `cause`.
 *
 * The collaborators are injectable (defaulted) purely so the failure paths
 * are unit-testable against a temp-dir fixture without ever spawning npm —
 * production callers pass nothing.
 *
 * @param name - A workspace member name (`jssm-viz`, `jssm-fence`, or `jssm-cli`)
 * @param version - The exact lockstep version to publish (and to rewrite the `jssm` dependency to)
 * @param dry_run - Passed through to {@link buildPublishArgs}
 * @param options.publish - The publish invoker, given the {@link buildPublishArgs} argv (defaults to {@link runNpmPublish})
 * @param options.cwd - Directory the member's manifest path is resolved against (defaults to the process's cwd; overridable for temp-dir test fixtures)
 * @param options.write_file - The file writer used for both the rewrite and the restore (defaults to `fs.writeFileSync`; injectable so tests can force a restore failure)
 * @throws {Error} when the manifest has no `"jssm"` entry in `dependencies` to rewrite (thrown BEFORE anything is written — the manifest is untouched); when the publish itself fails (the manifest is restored first, and the publish's own error propagates unchanged); or when the restore write fails (see above — the manifest may be left rewritten)
 *
 * @example
 * // production shape: rewrite, npm publish -w jssm-viz --dry-run, restore
 * publishMember('jssm-viz', '6.0.0-alpha.12', true);
 */
const publishMember = (name, version, dry_run, { publish = runNpmPublish, cwd = process.cwd(), write_file = fs.writeFileSync } = {}) => {

  const manifest_path  = path.join(cwd, manifestPathFor(name)),
        original_text  = fs.readFileSync(manifest_path, 'utf8'),
        rewritten_text = rewriteDependencyValue(original_text, 'jssm', version);

  if (rewritten_text === original_text) {
    throw new Error(`${manifest_path}: expected a "jssm": "file:../.." dependency to rewrite before publish, found none`);
  }

  console.log(`${name}: rewriting jssm dependency to ${version} for publish`);
  write_file(manifest_path, rewritten_text);

  let publish_error;

  try {
    publish(buildPublishArgs(name, dry_run));
  } catch (e) {
    publish_error = e;
    throw e;
  } finally {

    try {
      write_file(manifest_path, original_text);
      console.log(`${name}: restored ${manifest_path} to its original bytes (jssm dependency back to its file: form)`);
    } catch (restore_error) {

      // A throw from a finally block replaces any in-flight exception, which
      // is exactly the double-fault hazard: the restore failure must carry
      // the publish failure along rather than swallow it. Log both loudly,
      // then propagate one error holding both on its cause.
      console.log(`${name}: RESTORE FAILED: could not write ${manifest_path} back to its original bytes: ${restore_error.message}`);
      console.log(`${name}: ${manifest_path} may be left with its jssm dependency rewritten to ${version} and needs manual recovery (restore the "jssm": "file:../.." form)`);

      if (publish_error !== undefined) {
        console.log(`${name}: the publish itself had ALSO failed: ${publish_error.message}`);
        throw new Error(
          `${name}: publish failed AND restoring ${manifest_path} failed; the manifest may be left rewritten and needs manual recovery (both underlying errors are on this error's cause as publish_error/restore_error)`,
          { cause: { publish_error, restore_error } },
        );
      }

      throw new Error(
        `${name}: published, but restoring ${manifest_path} failed; the manifest may be left rewritten and needs manual recovery`,
        { cause: restore_error },
      );

    }

  }

};



// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

/**
 * Runs the full ordered publish: resolves every package's current version,
 * plans skip/publish decisions against live `npm view` lookups, and — for
 * each package needing a publish, in {@link PUBLISH_ORDER} — rewrites (if a
 * workspace member), publishes, and restores. Stops at the first failure
 * (the manifest restore has already been attempted by then) rather than
 * continuing past a broken link in the dependency chain; exits 0 once every
 * package is either skipped or successfully published. A hard failure during
 * the resolve/plan phase — an unreadable or mismatched manifest, or an `npm
 * view` failure that isn't a clean "not published yet" — prints its own
 * `Hard error:` line and exits 1 (mirroring `verify_version_bump.cjs`'s
 * handling) rather than escaping as a raw stack dump.
 */
const main = () => {

  const dry_run = process.argv.includes('--dry-run');

  let plan;

  try {
    plan = planPublishes(resolvePackages(), ({ name, version }) => isVersionPublished(name, version));
  } catch (e) {
    console.log(`Hard error: ${e.message}`);
    process.exit(1);
  }

  if (allSkipped(plan)) {
    console.log('all packages already published at their current versions; nothing to publish');
    process.exit(0);
  }

  for (const entry of plan) {

    if (entry.action === 'skip') {
      console.log(`skip: ${entry.reason}`);
      continue;
    }

    console.log(`publish: ${entry.name}@${entry.version}${dry_run ? ' (--dry-run)' : ''}`);

    try {

      if (entry.name === 'jssm') {
        publishRoot(dry_run);
      } else {
        publishMember(entry.name, entry.version, dry_run);
      }

      console.log(`ok: ${entry.name}@${entry.version} published`);

    } catch (e) {
      console.log(`FAILED: ${entry.name}@${entry.version}: ${e.message}`);
      process.exit(1);
    }

  }

  process.exit(0);

};



if (require.main === module) { main(); }

module.exports = {
  PUBLISH_ORDER,
  manifestPathFor,
  readManifest,
  resolvePackages,
  escapeRegExp,
  replaceJsonStringField,
  findObjectSpan,
  rewriteDependencyValue,
  planPublishes,
  allSkipped,
  isUnpublishedVersionError,
  isVersionPublished,
  buildPublishArgs,
  runNpmPublish,
  publishRoot,
  publishMember,
};
