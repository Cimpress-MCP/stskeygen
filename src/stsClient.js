const request = require("request-promise");

async function getKeys({ username, password, profileName, connection, role }) {
  const result = await request({
    uri: `https://${profileName}.aws.cimpress.io/sts`,
    method: "POST",
    json: {
      username,
      password,
      connection,
      role
    }
  });

  if (typeof result === "string") {
    throw new Error(result);
  }

  return result.Credentials;
}

module.exports = { getKeys };
