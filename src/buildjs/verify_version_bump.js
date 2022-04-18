
const { execSync }     = require('child_process'),
      { readFileSync } = require('fs'),
      semver           = require('semver');

const package          = readFileSync('./package.json'),
      pJson            = JSON.parse(package),
      priv_version     = pJson.version;

const public_version   = `${execSync('npm view jssm version')}`.trim();



if (semver.valid(public_version)) {
  if (semver.valid(priv_version)) {
    if (semver.gt(public_version, priv_version)) {
      console.log(`Version regression: locally ${priv_version}, publicly ${public_version}`);
    } else {
      if (semver.gt(priv_version, public_version)) {


        console.log(`Version is updated; passing ☑ (public ${public_version}, private ${priv_version}`);
        process.exit(0);


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
