#!/usr/bin/env node
const P = require('bluebird');
const exec = P.promisify(require('child_process').exec);
const semver = require('semver');
const package = require(`${process.cwd()}/package.json`);

let complete = false;
let packageName = package.name;
let packageVersion = package.version;
console.log(`package version of ${packageVersion}: ${packageName}`);
let packageMajorMinor = `${semver.major(packageVersion)}.${semver.minor(packageVersion)}`;
let viewCommand = `npm view ${packageName}@${packageMajorMinor} version --json`;
if (package.publishConfig) {
  viewCommand += ` --registry=${package.publishConfig.registry}`;
}

exec(viewCommand)
  .then(versions => {
    if (versions) {
      versions = JSON.parse(versions);
      if (!Array.isArray(versions)) {
        versions = [ versions ];
      }
      let latestVersion = semver.maxSatisfying(versions, '*');
      console.log(`latest published version: ${latestVersion}`);
      let newVersion = semver.inc(latestVersion, 'patch');
      console.log(`version to publish: ${newVersion}`);
      return exec(`npm --allow-same-version --no-git-tag-version version ${newVersion}`);
    }
    console.log(`no published version, using package version`);
    return exec(`npm --allow-same-version --no-git-tag-version version ${packageVersion}`);
  })
  .then(gitTag => gitTag.trim())
  .tap(gitTag => exec(`echo ${gitTag} > .git-tag`))
  .then(gitTag => console.log(`${gitTag} written to .git-tag`))
  .tap(() => complete = true)
  .catch(e => {
    console.log(e);
    complete = true;
  });

const wait = () => {
  if (!complete) {
    setTimeout(wait, 1000);
  }
};
wait();
