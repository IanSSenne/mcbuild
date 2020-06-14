const path = require("path");
const fs = require("fs");



const config = require("./config");
const logger = require("./log");



const postload_tasks = [];
let potentialLanguages = [];
const languages = {};
const file_handlers = new Map();
const target = path.resolve(process.cwd(), "./lang");








function loadLanguageFromPath(lang, location) {
    if (!languages[lang]) {
        languages[lang] = require(path.join(location, "/entry.js"))(file_handlers).exported;
        config.addConfig(lang, require(path.join(location, "/config.js")));
    }
}



function loadLanguages() {
    if (fs.existsSync(target)) {
        potentialLanguages.splice(0, potentialLanguages.length, ...fs.readdirSync(target));
        for (let language of potentialLanguages) {
            const location = path.join(target, language);
            if (fs.existsSync(path.join(location, "entry.js")) && fs.existsSync(path.join(location, "config.js"))) {
                loadLanguageFromPath(language, location);
            }
        }
    } else {
        logger.warn("not loading languages, lang folder not found");
    }
}






module.exports = { postload_tasks, loadLanguageFromPath, loadLanguages, languages, file_handlers, potentialLanguages, target };