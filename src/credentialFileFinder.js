const { promisify } = require("util");
const path = require("path");
const fs = require("fs");

async function findCredentialFiles() {
  const credentialFileLocations = [];
  const credentialFileBaseDirs = [
    process.env.HOME,
    `${process.env.HOMEDRIVE}${process.env.HOMEPATH}`,
    process.env.USERPROFILE
  ];

  credentialFileBaseDirs.forEach(fileBaseDir => {
    if (fileBaseDir) {
      const filePath = path.join(fileBaseDir, ".aws", "credentials");
      if (fs.existsSync(filePath)) {
        credentialFileLocations.push(filePath);
      }
    }
  });

  if (credentialFileLocations.length === 0) {
    let defaultPath;
    if (process.platform === "win32") {
      defaultPath = path.join(process.env.USERPROFILE, ".aws", "credentials");
    } else {
      defaultPath = path.join(process.env.HOME, ".aws", "credentials");
    }

    if (!fs.existsSync(path.dirname(defaultPath))) {
      await promisify(fs.mkdir)(path.dirname(defaultPath));
    }
    await promisify(fs.writeFile)(defaultPath, "");
    credentialFileLocations.push(defaultPath);
  }

  return credentialFileLocations;
}

module.exports = { findCredentialFiles };
