
const fs = require("fs");
const path = require("path");
const watch = require("node-watch");
const { performance } = require("perf_hooks");



const interface = require("./interface");
const config = require("./config");
const logger = require("./log");
const io = require("./io");
const errors = require("./errors");
const fail = require("./error_loggers");
const shared = require("./shared_working");



const F_WRITE_CONFIG_TYPE = process.argv.indexOf("-config") != -1 && process.argv[process.argv.indexOf("-config") + 1];


//load the persistent config even if its not used. this is so that it will register its before exit event listener
require("./persistent");



const SRC_DIR = path.resolve(process.cwd() + "/src");
const file_handlers = new Map();
const postload_tasks = [];
const languages = {};



shared.set("languages", languages);


interface.addModule(path.resolve(__dirname, "./lang_placeholder.js"), `!lang`, _ => languages);

function loadLanguageFromPath(lang, location) {
    postload_tasks.push({
        exec: () => {
            languages[lang] = require(path.join(location, "/entry.js"))(file_handlers).exported;
        },
        lang
    });
    config.addConfig(lang, require(path.join(location, "/config.js")));
}



function loadLanguages() {
    const target = path.resolve(process.cwd(), "./lang");
    if (fs.existsSync(target)) {
        const potentialLanguages = fs.readdirSync(target);
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



try {
    config.addConfig("mc", require("../lang/mc/config"));
    loadLanguages();
    config.populate();
    if (!F_WRITE_CONFIG_TYPE) {
        languages.mc = require("../lang/mc/entry")(file_handlers).exported;
        postload_tasks.forEach(task => {
            try {
                task.exec()
            } catch (e) {
                fail.critical(`failed to initialize language '${task.lang}'`, e);
            }
        });
    }
} catch (e) {
    fail.critical("failed to load languages", e);
}



if (F_WRITE_CONFIG_TYPE) {
    if (fs.existsSync(path.resolve(process.cwd(), "./config.js")) || fs.existsSync(path.resolve(process.cwd(), "./config.json"))) {
        logger.error("config file exists, please remove or rename your current config if you would like to generate a new one");
    } else if (F_WRITE_CONFIG_TYPE === "js") {
        fs.writeFileSync(path.resolve(process.cwd(), "./config.js"), `//generated config\nmodule.exports = ${JSON.stringify(config.config(), null, 2)}`);
    } else if (F_WRITE_CONFIG_TYPE === "json") {
        fs.writeFileSync(path.resolve(process.cwd(), "./config.json"), JSON.stringify(config.config(), null, 2));
    } else {
        logger.error("invalid config extension, valid extensions are [js,json] got " + F_WRITE_CONFIG_TYPE);
    }
    process.exit(1);
    return null;
}



function dec(value) {
    const v = value.toString();
    const parts = v.split(".");
    return parts[0].concat(".", parts[1].substr(0, 3));
}



const compiler_handler = async (evt, file_path) => {
    if (evt === "remove") {
        io.syncFSToVirtual();
    } else {
        try {
            const start = performance.now();
            const parsedPath = path.parse(file_path);
            if (file_handlers.has(parsedPath.ext)) {
                file_handlers.get(parsedPath.ext)(file_path);
            } else {
                logger.error("did not find handler for file type '" + parsedPath.ext + "'");
            }
            const startFS = performance.now();
            await io.syncFSToVirtual(file_path);
            const end = performance.now();
            logger.task(`finished task in ${dec(end - start)} ms, FileIO took ${dec(end - startFS)} ms`);
        } catch (e) {
            if (e instanceof errors.CriticalError) {
                fail.critical(`failed to build file ${file_path}`, e, false);
            } else if (e instanceof errors.CompilerError) {
                fail.compiler(e);
                logger.task(`task failed!`);
            } else {
                fail.critical("unknown error", e);
            }
        }
    }
};



if (!F_WRITE_CONFIG_TYPE) {
    watch(SRC_DIR, compiler_handler);






    logger.info("doing initial build.");



    (async () => {
        const initial = fs.readdirSync(SRC_DIR);
        for (let i = 0; i < initial.length; i++) {
            await compiler_handler(null, path.resolve(SRC_DIR, initial[i]));
        }
    })()
}