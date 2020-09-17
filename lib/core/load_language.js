const path = require("path");
const fs = require("fs");

const config = require("./config");
const logger = require("./log");
const postload_tasks = [];
const languages = {};
const file_handlers = new Map();
const PROJECT_PATH = path.resolve(process.cwd(), '.mcproject', 'PROJECT.json');
const LOCAL_PATH = path.resolve(process.env.APPDATA, 'mc-build', 'local');


let potentialLanguages = [];
function loadLanguageFromPath(lang, location) {
  if (!languages[lang]) {
    languages[lang] = require(path.join(location, "/entry.js"))(
      file_handlers
    ).exported;
  }
}
function loadLanguageConfigFromPath(lang, location) {
  if (!languages[lang]) {
    config.addConfig(lang, require(path.join(location, "/config.js")));

  }
}
function getName(name) {
  if (!name.startsWith("lang-")) {
    logger.error("malformed language name! expected 'lang-'");
  }
  return name.substr(5).split("/")[0];
}
function loadLanguages() {
  const project = require(PROJECT_PATH);
  project.languages.forEach((lang) => {
    if (lang.remote.type === "file") {
      const name = getName(lang.name);
      loadLanguageConfigFromPath(name, lang.remote.path);
    } else {
      const name = getName(lang.name);
      loadLanguageConfigFromPath(name, path.resolve(LOCAL_PATH, '.cache', lang.name));
    }
  });
  project.languages.forEach((lang) => {
    if (lang.remote.type === "file") {
      const name = getName(lang.name);
      loadLanguageFromPath(name, lang.remote.path);
    } else {
      const name = getName(lang.name);
      loadLanguageFromPath(name, path.resolve(LOCAL_PATH, '.cache', lang.name));
    }
  });
}

module.exports = {
  postload_tasks,
  loadLanguageFromPath,
  loadLanguages,
  languages,
  file_handlers,
  potentialLanguages
};
