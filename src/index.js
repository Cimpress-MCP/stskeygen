#!/usr/bin/env node
/* eslint-disable no-console */
const { promisify } = require("util");
const stsClient = require("./stsClient");
const credentialsFileFinder = require("./credentialFileFinder");
const configLoader = require("./configLoader");
const fs = require("fs");
const ini = require("ini");
const commandLineUsage = require("command-line-usage");

async function exec() {
  const config = await configLoader.load();
  if (config.help) {
    console.log(
      commandLineUsage([
        {
          header:
            "Generates an STS key and saves it to your AWS credentials file",
          optionList: configLoader.optionDefinitions,
          reverseNameOrder: true,
          hide: "password"
        },
        {
          header: "Stored config:"
        }
      ])
    );

    const savedConfig = require("config"); // eslint-disable-line global-require
    console.log(JSON.stringify(savedConfig, null, 2));
    return;
  }

  const creds = await stsClient.getKeys(config);

  const newIniCreds = {};
  newIniCreds[config.saveAs] = {
    account_number: creds.AccountNumber,
    role: creds.Role,
    aws_access_key_id: creds.AccessKeyId,
    aws_secret_access_key: creds.SecretAccessKey,
    aws_session_token: creds.SessionToken,
    expiration: creds.Expiration
  };

  if (config.saveAsDefault) {
    newIniCreds.default = newIniCreds[config.saveAs];
  }

  const roleUriPath = config.role
    ? `role/${config.role.replace(/\\/g, "/")}`
    : "";

  console.log("Console login URL:");
  console.log(`https://${config.profileName}.aws.cimpress.io/${roleUriPath}\n`);

  if (config.admin) {
    const adminProfileName = `${config.saveAs.replace(/-access/g, "")}@admin`;
    const adminRole = `${creds.Role.split("/")
      .slice(-1)[0]
      .replace(/-access/g, "")}@admin`;
    const adminRoleArn = `arn:aws:iam::${
      creds.AccountNumber
    }:role/${adminRole}`;
    newIniCreds[adminProfileName] = {
      role_arn: adminRoleArn,
      source_profile: config.saveAs
    };

    const adminRoleParts = creds.Role.split("/");
    const adminRoleName = (adminRoleParts.length === 2
      ? adminRoleParts[1]
      : adminRoleParts[0]
    ).replace(/-access/g, "");

    const switchRoleUriPath = `switchrole?account=${
      creds.AccountNumber
    }&roleName=${adminRoleName}@admin&displayName=${adminRoleName}@admin`.replace(
      /\+/g,
      "%2B"
    );

    console.log("Admin switch role URL:");
    console.log(`https://signin.aws.amazon.com/${switchRoleUriPath}\n`);
  }

  const credentialFiles = await credentialsFileFinder.findCredentialFiles();
  await Promise.all(
    credentialFiles.map(async credentialFile => {
      const rawExistingIniCreds = await promisify(fs.readFile)(
        credentialFile,
        "UTF8"
      );
      const existingIniCreds = ini.parse(rawExistingIniCreds);
      const mergedIniCreds = Object.assign({}, existingIniCreds, newIniCreds);
      return promisify(fs.writeFile)(
        credentialFile,
        ini.stringify(mergedIniCreds)
      );
    })
  );
  console.log(
    `Credentials saved to:\n ${JSON.stringify(credentialFiles, null, 2)}\n`
  );
  console.log(JSON.stringify(newIniCreds, null, 2));
}

exec().catch(e => {
  console.error(e.message);
  process.exit(1);
});
