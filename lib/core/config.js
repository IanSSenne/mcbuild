const fs = require("fs");
const path = require("path");
const logger = require("./log");
const merge = require("merge-options");

const CONFIG_PATH_JSON = path.resolve(process.cwd(), "./config.json");
const CONFIG_PATH_JS = path.resolve(process.cwd(), "./config.js");

let options = {
  global: {
    onBuildSuccess: null
  }
};
let populated = false;

function populate() {
  if (!populated) {
    populated = true;
    if (fs.existsSync(CONFIG_PATH_JSON)) {
      logger.info("using config.json");
      options = merge(options, require(CONFIG_PATH_JSON));
    } else if (fs.existsSync(CONFIG_PATH_JS)) {
      logger.info("using config.js");
      const potentialOptions = require(CONFIG_PATH_JS);
      let computedOptions = potentialOptions;
      if (typeof potentialOptions === "function") {
        computedOptions = potentialOptions({
          build: process.argv.includes("-build")
        });
      }
      options = merge(options, computedOptions);
    } else {
      logger.warn(
        "config not found, using defaults to generate a config please use 'mcb -config [json|js]' to generate a config"
      );
    }
  }
}

function addConfig(lang, conf) {
  options[lang] = conf;
}

module.exports.config = () => {
  populate();
  return options;
};
module.exports.addConfig = addConfig;
module.exports.populate = populate;
