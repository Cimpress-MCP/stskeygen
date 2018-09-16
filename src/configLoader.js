const { promisify } = require("util");
const prompt = require("prompt");
const path = require("path");
const fs = require("fs");
const commandLineArgs = require("command-line-args");

const configDir = path.join(
  process.platform === "win32" ? process.env.APPDATA : process.env.HOME,
  ".credgen"
);

const configFile = path.join(configDir, "default.json");

process.env.NODE_CONFIG_DIR = configDir;
process.env.SUPPRESS_NO_CONFIG_WARNING = true;

const optionDefinitions = [
  {
    name: "profileName",
    alias: "p",
    required: true,
    type: String,
    description: "AWS profile to store credentials in on this machine"
  },
  {
    name: "username",
    alias: "u",
    required: true,
    type: String,
    description: "Username to authenticate with"
  },
  {
    name: "password",
    required: true,
    type: String,
    description: "Password",
    hidden: true,
    replace: "*"
  },
  {
    name: "connection",
    alias: "c",
    required: true,
    type: String,
    description: "Auth0 connection to authenticate against"
  },
  { name: "role", alias: "r", type: String, description: "Role to assert" },
  {
    name: "admin",
    alias: "a",
    type: Boolean,
    description: "If specified, will also create an admin switch role profile"
  },
  {
    name: "help",
    alias: "h",
    type: Boolean,
    description: "Print this usage guide"
  },
  {
    name: "saveAs",
    alias: "s",
    type: String,
    description: "Profile to save (if omitted, will save as --profileName)"
  },
  {
    name: "saveAsDefault",
    alias: "d",
    type: Boolean,
    description: "Also save to the default profile"
  },
  {
    name: "saveConfig",
    type: Boolean,
    description:
      "Saves provided options to a configuration object for use as defaults in subsequent runs"
  },
  {
    name: "clearConfig",
    type: Boolean,
    description: "Clears saved configuration"
  }
];

const promptOptionDefinitions = optionDefinitions.reduce(
  (acc, optionDefinition) => {
    if (optionDefinition.required) {
      acc[optionDefinition.name] = Object.assign({}, optionDefinition);
      acc[optionDefinition.name].type = optionDefinition.type.name;
      delete acc[optionDefinition.name].description;
    }
    return acc;
  },
  {}
);

async function load() {
  const params = commandLineArgs(optionDefinitions);
  if (params.help) {
    return params;
  }

  if (!fs.existsSync(configDir)) {
    await promisify(fs.mkdir)(configDir);
  }

  if (params.clearConfig) {
    await promisify(fs.writeFile)(configFile, "{}");
  }

  let config = require("config"); // eslint-disable-line global-require

  config = Object.assign(config, params);

  prompt.start();
  prompt.override = config;
  prompt.message = "";

  const promptedParams = await promisify(prompt.get)({
    properties: promptOptionDefinitions
  });

  config = Object.assign(config, promptedParams);
  if (config.saveConfig) {
    const savedConfig = Object.assign({}, config);
    delete savedConfig.password;
    delete savedConfig.saveConfig;
    delete savedConfig.clearConfig;
    await promisify(fs.writeFile)(
      configFile,
      JSON.stringify(savedConfig, null, 2)
    );
  }

  config.saveAs = config.saveAs || config.profileName;

  return config;
}

module.exports = { load, optionDefinitions };
