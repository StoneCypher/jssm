/**
 * Release-version gate — CI's `verify-version-bump` job runs this on every
 * push (.github/workflows/nodejs.yml). Loops every workspace package
 * (`jssm` at the repo root, plus `jssm-viz`/`jssm-fence`/`jssm-cli` once the
 * workspace packages exist under `packages/`), confirms each one's local
 * `package.json` version is a real semver bump over what npm currently has
 * published for that package name, and asserts LOCKSTEP — every checked
 * package must be at the exact same version, since the whole workspace
 * releases as one tag.
 *
 * A package that has never been published (an `npm view` 404) counts as
 * publishable — there is nothing to regress against. Any OTHER `npm view`
 * failure (auth, network, registry outage) is a hard error: a flaky lookup
 * must never be read as "safe to publish".
 *
 * While the root `package.json` has no `workspaces` field (true today, and
 * true again for any push that lands before the workspace packages are
 * scaffolded), only the root `jssm` package is checked — this keeps CI green
 * between the workspace-migration tasks. Once `workspaces` is present, a
 * `packages/*` entry with no on-disk manifest is a hard error: the manifest
 * was promised and is missing, not merely absent-by-convention.
 *
 * The gate is read-only: it makes no git calls and creates no tag. It used
 * to tag `v<version>` on success, but that tag lived only on the discarded
 * CI runner (the `release` job checks out fresh), littered real tags when run
 * locally, and made a correct bump fail on rerun once the tag existed. The
 * real release tags are unprefixed and come from `gh release create` in the
 * `release` job. The old `--check-only` flag is no longer needed; argv is not
 * read, so passing it is harmless.
 *
 * @example
 * // CI's actual invocation (.github/workflows/nodejs.yml, verify-version-bump)
 * //   $ node src/buildjs/verify_version_bump.cjs
 * //   lockstep ok: all packages at 6.0.0
 * //   jssm: version is updated (public 5.163.4, private 6.0.0)
 * //   (exit 0)
 *
 * @see .github/workflows/nodejs.yml   the verify-version-bump and release jobs
 * @see src/buildjs/tests/verify_version_bump.spec.ts   unit coverage for the pure functions below
 */

const { execFileSync } = require('child_process'),
      { readFileSync, readdirSync } = require('fs'),
      semver           = require('semver');



/** The three workspace packages expected under `packages/` once they exist, used only as a fallback when `workspaces` globs are declared but resolve to nothing on disk. */
const DEFAULT_WORKSPACE_PACKAGES = ['jssm-viz', 'jssm-fence', 'jssm-cli'];

/** On Windows, `npm` resolves to a `.cmd` shim; Node refuses to spawn `.cmd`/`.bat` files without a shell (the CVE-2024-27980 hardening), so that platform needs `NPM_NEEDS_SHELL` below. POSIX's real `npm` binary needs neither. */
const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/** Whether {@link getPublishedVersion}'s `npm view` call must run through a shell — true only on Windows, where CI never runs (CI is ubuntu-latest), so the shell path is exercised only by local smoke runs. */
const NPM_NEEDS_SHELL = process.platform === 'win32';

/** A conservative match for valid npm package names (plain or scoped), checked before any name is interpolated into a shell command — defense in depth for {@link NPM_NEEDS_SHELL}, since a shell (unlike an argv array) can be tricked by metacharacters in a malformed manifest's `name` field. */
const SAFE_NPM_NAME = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/i;



/**
 * Decides whether one package is publishable: its local manifest version
 * must be a real semver increase over the version npm currently reports as
 * published. An unpublished package (no npm history to regress against)
 * always passes.
 *
 * @param name - Package name, used only to label the returned message
 * @param local_version - Version read from this package's own package.json
 * @param published_version - Version `npm view <name> version` reported, or
 *   `null` when the package has never been published (a 404 lookup)
 * @returns `pass` is true when this package is safe to release; `message`
 *   explains the verdict either way and always names the package
 *
 * @example
 * checkOnePackage('jssm', '6.0.1', '6.0.0');
 * // => { pass: true, message: 'jssm: version is updated (public 6.0.0, private 6.0.1)' }
 *
 * @example
 * checkOnePackage('jssm-cli', '1.0.0', null);
 * // => { pass: true, message: 'jssm-cli: unpublished; first publish at 1.0.0' }
 */
const checkOnePackage = (name, local_version, published_version) => {

  if (!semver.valid(local_version)) {
    return { pass: false, message: `${name}: invalid local version "${local_version}"` };
  }

  if (published_version === null) {
    return { pass: true, message: `${name}: unpublished; first publish at ${local_version}` };
  }

  if (!semver.valid(published_version)) {
    return { pass: false, message: `${name}: invalid published version "${published_version}"` };
  }

  if (semver.gt(local_version, published_version)) {
    return { pass: true, message: `${name}: version is updated (public ${published_version}, private ${local_version})` };
  }

  if (semver.gt(published_version, local_version)) {
    return { pass: false, message: `${name}: version regression: locally ${local_version}, publicly ${published_version}` };
  }

  return { pass: false, message: `${name}: version unchanged: locally ${local_version}, publicly also ${published_version}` };

};



/**
 * Asserts every checked package sits at the identical version, since this
 * repo tags and publishes its whole workspace as one lockstep release. Pure
 * — takes already-resolved `{name, version}` pairs, touches nothing on disk.
 *
 * @param packages - One `{name, version}` entry per checked package, in check order
 * @returns `pass` is true when all versions match; otherwise `message` names
 *   the first package whose version diverges from the first package checked
 *
 * @example
 * checkLockstep([{ name: 'jssm', version: '6.0.1' }, { name: 'jssm-viz', version: '6.0.1' }]);
 * // => { pass: true, message: 'lockstep ok: all packages at 6.0.1' }
 *
 * @example
 * checkLockstep([{ name: 'jssm', version: '6.0.1' }, { name: 'jssm-viz', version: '6.0.0' }]);
 * // => { pass: false, message: 'lockstep violation: jssm-viz is at 6.0.0, expected 6.0.1 (from jssm)' }
 */
const checkLockstep = (packages) => {

  if (packages.length === 0) {
    return { pass: true, message: 'lockstep ok: no packages to check' };
  }

  const [first, ...rest] = packages,
        divergent        = rest.find(p => p.version !== first.version);

  if (divergent) {
    return {
      pass    : false,
      message : `lockstep violation: ${divergent.name} is at ${divergent.version}, expected ${first.version} (from ${first.name})`,
    };
  }

  return { pass: true, message: `lockstep ok: all packages at ${first.version}` };

};



/**
 * Recognizes an `npm view` failure as "package never published" rather than
 * a real error, so a 404 can be treated as first-publish-always-passes
 * instead of a hard failure. Matches npm's own 404 phrasing across the CLI
 * versions this repo has run in CI (`E404` error code; `is not in this
 * registry`/`is not in the npm registry` wording).
 *
 * @param stderr_text - Combined stderr (or error message) from a failed `npm view`
 * @returns true when the failure means "unpublished", false for any other failure
 *
 * @example
 * isUnpublishedError('npm error code E404\nnpm error 404 Not Found'); // => true
 *
 * @example
 * isUnpublishedError('npm error code ETIMEDOUT'); // => false
 */
const isUnpublishedError = (stderr_text) =>
  /E404/.test(stderr_text) || /is not in (the|this) (npm )?registry/i.test(stderr_text);



/**
 * Looks up a package's currently published npm version. A 404 (package
 * never published) is a normal, expected outcome here — `version: null` —
 * never an exception; any other failure is thrown so a flaky lookup can
 * never be silently read as "safe to publish".
 *
 * @param name - The npm package name to look up
 * @returns `{ version }`, where `version` is the published semver string, or
 *   `null` when the package has never been published
 * @throws {Error} when `npm view` fails for any reason other than a 404
 *
 * @example
 * getPublishedVersion('jssm'); // => { version: '5.163.4' }
 */
const getPublishedVersion = (name) => {

  if (!SAFE_NPM_NAME.test(name)) {
    throw new Error(`refusing to look up unsafe-looking package name "${name}"`);
  }

  try {
    const out = execFileSync(NPM_BIN, ['view', name, 'version'], { shell: NPM_NEEDS_SHELL, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
    return { version: out };
  } catch (e) {

    const stderr = (e.stderr ?? '').toString() || (e.message ?? '');

    if (isUnpublishedError(stderr)) {
      return { version: null };
    }

    throw new Error(`npm view ${name} version failed:\n${stderr}`, { cause: e });

  }

};



/**
 * Expands one `workspaces` glob pattern into directory names. Only the
 * trailing-`/*` form (e.g. `packages/*`, the sole pattern this repo uses)
 * needs a directory listing; a literal path (no wildcard) resolves to its
 * own basename with no filesystem access. The directory lister is injected
 * so this stays pure and testable without touching real disk.
 *
 * @param pattern - One entry from package.json's `workspaces` array (e.g. `'packages/*'`)
 * @param list_dir_names - Given a directory path, returns the names of its subdirectories
 * @returns Directory/package names this pattern resolves to
 *
 * @example
 * expandWorkspacePattern('packages/*', (dir) => ['jssm-viz', 'jssm-cli']);
 * // => ['jssm-viz', 'jssm-cli']
 *
 * @example
 * expandWorkspacePattern('packages/jssm-cli', () => { throw new Error('unused'); });
 * // => ['jssm-cli']
 */
const expandWorkspacePattern = (pattern, list_dir_names) => {

  if (!pattern.endsWith('/*')) {
    return [pattern.split('/').pop()];
  }

  return list_dir_names(pattern.slice(0, -2));

};



/**
 * Reads real subdirectory names off disk — the impure adapter
 * {@link expandWorkspacePattern} calls in production. A missing base
 * directory (workspaces declared before `packages/` exists) resolves to no
 * names rather than throwing; {@link resolveWorkspaceDirNames}'s
 * known-names fallback covers that case.
 *
 * @param dir - Directory to list, relative to the process's cwd
 * @returns Names of `dir`'s subdirectories, or `[]` if `dir` doesn't exist
 */
const listRealDirNames = (dir) => {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
};



/**
 * Derives which workspace packages to check from the root manifest's
 * `workspaces` field. Returns `null` to mean "root-only mode" (no
 * `workspaces` field at all — true today, before the workspace packages are
 * scaffolded); returns a package-name array once `workspaces` is present,
 * falling back to {@link DEFAULT_WORKSPACE_PACKAGES} if the declared globs
 * resolve to nothing on disk.
 *
 * @param root_pkg - Parsed root package.json
 * @param list_dir_names - Given a directory path, returns the names of its subdirectories (defaults to a real fs read)
 * @returns `null` in root-only mode, else the workspace package names to check
 *
 * @example
 * resolveWorkspaceDirNames({ name: 'jssm' }, () => []); // => null (no workspaces field)
 *
 * @example
 * resolveWorkspaceDirNames({ workspaces: ['packages/*'] }, (dir) => ['jssm-viz', 'jssm-fence', 'jssm-cli']);
 * // => ['jssm-cli', 'jssm-fence', 'jssm-viz']
 */
const resolveWorkspaceDirNames = (root_pkg, list_dir_names = listRealDirNames) => {

  if (!root_pkg.workspaces) { return null; }

  const patterns = Array.isArray(root_pkg.workspaces) ? root_pkg.workspaces : (root_pkg.workspaces.packages ?? []),
        names     = new Set();

  for (const pattern of patterns) {
    for (const name of expandWorkspacePattern(pattern, list_dir_names)) { names.add(name); }
  }

  return names.size > 0 ? [...names].sort() : [...DEFAULT_WORKSPACE_PACKAGES];

};



/**
 * Reads and parses one package.json from disk.
 *
 * @param path - Path to the manifest, relative to the process's cwd
 * @returns The parsed manifest
 * @throws {Error} when the file is missing or is not valid JSON
 */
const readManifest = (path) => JSON.parse(readFileSync(path, 'utf8'));



/**
 * Resolves every package this run must check — the root `jssm` package,
 * plus each workspace package once `workspaces` is declared — and reads
 * each one's manifest off disk.
 *
 * @returns One `{name, version}` entry per package to check, root first
 * @throws {Error} when a workspace package promised by `workspaces` has no
 *   readable manifest — the field was declared, so the package is expected
 *   to exist; this is never true while `workspaces` is absent (root-only mode)
 */
const resolvePackages = () => {

  const root_pkg            = readManifest('./package.json'),
        workspace_dir_names = resolveWorkspaceDirNames(root_pkg),
        manifest_paths      = [['jssm', './package.json']];

  if (workspace_dir_names !== null) {
    for (const dir_name of workspace_dir_names) {
      manifest_paths.push([dir_name, `packages/${dir_name}/package.json`]);
    }
  }

  return manifest_paths.map(([label, manifest_path]) => {

    let manifest;

    try {
      manifest = readManifest(manifest_path);
    } catch (e) {
      throw new Error(`workspace package "${label}" has no readable manifest at ${manifest_path} (${e.message})`, { cause: e });
    }

    return { name: manifest.name ?? label, version: manifest.version };

  });

};



/**
 * Decides whether the whole workspace may be released, without side effects:
 * asserts lockstep first, then checks every package against its published
 * version. This is the gate's entire verdict; the CLI wrapper only prints the
 * messages and turns `ok` into an exit code. It never tags: the release tag is
 * created later by `gh release create` in the `release` job.
 *
 * A lockstep failure short-circuits before any lookup, so a mis-versioned
 * workspace costs no registry calls. A lookup that throws (anything but a 404,
 * per {@link getPublishedVersion}) fails the gate with a `Hard error checking`
 * message and stops further lookups, so a flaky registry is never read as
 * "safe to publish".
 *
 * @param packages - One `{name, version}` entry per package to check, root
 *   first, as {@link resolvePackages} returns them
 * @param lookup_published - Given a package name, returns the version npm
 *   currently serves, or `null` if it was never published; may throw
 * @returns `ok` is true only when lockstep holds and every package is a real
 *   bump (or a first publish); `messages` are the lines to print, in order
 *
 * @example
 * decideRelease(
 *   [{ name: 'jssm', version: '6.0.0' }, { name: 'jssm-cli', version: '6.0.0' }],
 *   (name) => (name === 'jssm' ? '5.164.1' : null),
 * );
 * // => { ok: true, messages: [
 * //      'lockstep ok: all packages at 6.0.0',
 * //      'jssm: version is updated (public 5.164.1, private 6.0.0)',
 * //      'jssm-cli: unpublished; first publish at 6.0.0' ] }
 *
 * @example
 * decideRelease([{ name: 'jssm', version: '6.0.0' }], () => '6.0.0');
 * // => { ok: false, messages: [
 * //      'lockstep ok: all packages at 6.0.0',
 * //      'jssm: version unchanged: locally 6.0.0, publicly also 6.0.0' ] }
 *
 * @see checkLockstep
 * @see checkOnePackage
 */
const decideRelease = (packages, lookup_published) => {

  const lockstep = checkLockstep(packages);

  if (!lockstep.pass) { return { ok: false, messages: [lockstep.message] }; }

  const messages = [lockstep.message];
  let   ok       = true;

  for (const { name, version } of packages) {

    let published;

    try {
      published = lookup_published(name);
    } catch (e) {
      return { ok: false, messages: [...messages, `Hard error checking ${name}: ${e.message}`] };
    }

    const result = checkOnePackage(name, version, published);

    messages.push(result.message);
    ok = ok && result.pass;

  }

  return { ok, messages };

};



/**
 * Runs the gate as CI does: reads every manifest, asks npm for each published
 * version, prints {@link decideRelease}'s messages, and exits 0 on a pass or 1
 * on any failure. That exit code is CI's actual pass/fail signal
 * (.github/workflows/nodejs.yml, verify-version-bump). Read-only: no git calls.
 */
const main = () => {

  let packages;

  try {
    packages = resolvePackages();
  } catch (e) {
    console.log(`Hard error: ${e.message}`);
    process.exit(1);
  }

  const { ok, messages } = decideRelease(packages, (name) => getPublishedVersion(name).version);

  for (const message of messages) { console.log(message); }

  process.exit(ok ? 0 : 1);

};



if (require.main === module) { main(); }

module.exports = {
  checkOnePackage,
  checkLockstep,
  decideRelease,
  isUnpublishedError,
  getPublishedVersion,
  expandWorkspacePattern,
  resolveWorkspaceDirNames,
  resolvePackages,
  DEFAULT_WORKSPACE_PACKAGES,
};
