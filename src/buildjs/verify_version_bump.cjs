
const { execSync }     = require('child_process'),
      { readFileSync } = require('fs'),
      semver           = require('semver');



/**
 * Decides whether the local package version is a valid bump over the published one.
 *
 * CI runs this on every push, and every push to `main` is a release, so a
 * version that is not strictly greater than npm's would republish or regress.
 * The check is read-only: the release tag is created later by
 * `gh release create` in the `release` job, never here.
 * @param local_version - the version in this checkout's package.json
 * @param public_version - the version npm currently serves for jssm
 * @returns `ok` is true only for a strict semver increase; `message` explains the verdict
 * @example
 * check_version_bump('5.164.1', '5.164.0');
 * // { ok: true, message: 'Version is updated; passing ☑\n  (public 5.164.0, private 5.164.1)' }
 * @example
 * check_version_bump('5.164.0', '5.164.0');
 * // { ok: false, message: 'Version unchanged: locally 5.164.0, publicly also 5.164.0' }
 */
function check_version_bump(local_version, public_version) {

  if (!semver.valid(public_version)) { return { ok: false, message: `Invalid public version ${public_version}` }; }
  if (!semver.valid(local_version))  { return { ok: false, message: `Invalid private version ${local_version}` }; }

  if (semver.gt(public_version, local_version)) {
    return { ok: false, message: `Version regression: locally ${local_version}, publicly ${public_version}` };
  }

  if (semver.gt(local_version, public_version)) {
    return { ok: true, message: `Version is updated; passing ☑\n  (public ${public_version}, private ${local_version})` };
  }

  return { ok: false, message: `Version unchanged: locally ${local_version}, publicly also ${public_version}` };

}



if (require.main === module) {

  const local_version  = JSON.parse(readFileSync('./package.json')).version,
        public_version = `${execSync('npm view jssm version')}`.trim(),
        { ok, message } = check_version_bump(local_version, public_version);

  console.log(message);
  process.exit(ok ? 0 : 1);

}



module.exports = { check_version_bump };
