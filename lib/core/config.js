const fs = require("fs");
const path = require("path");
const logger = require("./log");
const merge = require("merge-options");



const CONFIG_PATH_JSON = path.resolve(process.cwd(), "./config.json");
const CONFIG_PATH_JS = path.resolve(process.cwd(), "./config.js");



let options = {

};


function populate() {
    if (fs.existsSync(CONFIG_PATH_JSON)) {
        logger.info("using config.json");
        options = merge(options, require(CONFIG_PATH_JSON));
    } else if (fs.existsSync(CONFIG_PATH_JS)) {
        logger.info("using config.js");
        options = merge(options, require(CONFIG_PATH_JS));
    } else {
        logger.warn("config not found, using defaults to generate a config please use MCBuild -config [json|js]");
    }
}



function addConfig(lang, conf) {
    options[lang] = conf;
}



module.exports.config = () => options;
module.exports.addConfig = addConfig;
module.exports.populate = populate;