
const { execSync }     = require('child_process'),
      { readFileSync } = require('fs'),
      semver           = require('semver');

const pkg              = readFileSync('./package.json'),
      pJson            = JSON.parse(pkg),
      priv_version     = pJson.version;

const public_version   = `${execSync('npm view jssm version')}`.trim(),
      last_commit_msg  = `${execSync('git show -s --format=%s')}`.trim().replace(/[^0-9a-z _\-=]/gi, '');



if (semver.valid(public_version)) {
  if (semver.valid(priv_version)) {
    if (semver.gt(public_version, priv_version)) {
      console.log(`Version regression: locally ${priv_version}, publicly ${public_version}`);
    } else {
      if (semver.gt(priv_version, public_version)) {

        try {

          console.log(`Version is updated; passing ☑\n  (public ${public_version}, private ${priv_version})\n\nApplying tags`);
          execSync(`git tag -a v${priv_version} -m ${JSON.stringify(last_commit_msg)}`);
          process.exit(0);

        } catch (e) {

          console.log("Error!\n=====\n");

          console.log( e.stdout.toString() );

          console.log("\n-----\n");
          console.log( e.stderr.toString() );

          console.log("\n-----\n");

          console.log( require('util').inspect(e) );

          console.log("\n=====\n");

        }


      } else {
        console.log(`Version unchanged: locally ${priv_version}, publicly also ${public_version}`);
    } }
  } else {
    console.log(`Invalid private version ${priv_version}`);
} } else {
  console.log(`Invalid public version ${public_version}`);
}

// valid exit manually controls as 0; anything getting here was in error
process.exit(1);
