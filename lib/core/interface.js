const Module = require("module");



const logger = require("./log");
const shared = require("./shared_working");



const modules = {};
const $require = Module.prototype.require;



function setModule(vloc, data, resolve) {
    modules[vloc] = { resolve, value: data };
}



function addModule(mod, vloc, resolve) {
    const loc = require.resolve(mod);
    const data = require(loc);
    setModule(vloc, data, resolve);
}



module.exports.addModule = addModule;



addModule("./io", "!io", _ => _);
addModule("./config", "!config", _ => _.config());
addModule("./persistent", "!persistent", _ => _);
addModule("./log", "!logger", _ => _);
addModule("./errors", "!errors", _ => _);



function logPossible(k, o) {
    logger.error(k);
    if (typeof o === "object") {
        Object.entries(o).forEach(([name, val]) => {
            logPossible(k + "/" + name, val[name]);
        });
    }
}



Module.prototype.require = function (id) {
    if (id.startsWith("!")) {
        try {
            const [base, ...rest] = id.split("/");
            let value = modules[base].resolve(modules[base].value);
            if (rest.length) {
                let item = null;
                while (item = rest.shift()) {
                    value = value[item];
                }
            }
            return value;
        } catch (e) {
            logger.error(`failed to resolve module '${id}' (${e.message})`);
            logger.error(`-------------------[Virtual Modules]-------------------`);
            Object.entries(modules).forEach(([name, mod]) => {
                logPossible(name, mod.resolve(mod.value));
            });
            logger.error(`-------------------------------------------------------`);
            throw e;
        }
    } else {
        return $require.apply(this, [id]);
    }
}