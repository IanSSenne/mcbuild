const path = require("path");



const CONFIG = require("!config/mc");
const File = require("!io/File");



let env;



function evaluate(line) {
    try {
        return (new Function("return `" + line.replace(/\\/g, "\\\\").replace(/<%/g, "${").replace(/%>/g, "}") + "`")).bind(env)();
    } catch (e) {
        return e.message;
    }
}



class MultiFile {
    constructor(file) {
        this.file = file;
        this.segments = {};
    }
    set(id, value) {
        this.segments[id] = this.segments[id] || [];
        this.segments[id].push(...value);
        this.file.setContents(Object.values(this.segments).flat().join("\n"));
        this.file.confirm();
    }
    reset(file) {
        delete this.segments[file];
    }
}
const tickFile = new File();
tickFile.setPath(path.resolve(process.cwd(), "./data/minecraft/functions/__generated__/events/tick.mcfunction"))
const tickFunction = new MultiFile(tickFile);
const loadFile = new File();
loadFile.setPath(path.resolve(process.cwd(), "./data/minecraft/functions/__generated__/events/load.mcfunction"))
const loadFunction = new MultiFile(loadFile);


class MCFunction extends File {
    constructor() {
        super();
        this.functions = [];
        this.namespace = "lang_error";
        this._path = Math.random().toString(36).substr(2);
    }
    addCommand(command) {
        this.functions.push(evaluate(command.replace(/\$block/g, this.namespace + ":" + this.getFunctionPath())));
    }
    getReference() {
        return this.namespace + ":" + this._path;
    }
    getContents() {
        return CONFIG.header + "\n\n" + this.functions.join("\n");
    }
    getPath() {
        return path.resolve(process.cwd(), "./data/", this.namespace, "./functions/", this._path + ".mcfunction");
    }
    getFunctionPath() {
        return this._path;
    }

    confirm(file) {
        if (this.getFunctionPath() === "load") {
            loadFunction.set(file, this.functions);
            const loadTag = new File();
            loadTag.setPath(path.resolve(process.cwd(), "./data/minecraft/tags/functions/load.json"));
            loadTag.setContents(JSON.stringify({
                replace: false,
                values: [
                    "minecraft:__generated__/events/load"
                ]
            }));
            loadTag.confirm();
        } else if (this.getFunctionPath() === "tick") {
            tickFunction.set(file, this.functions);
            const tickTag = new File();
            tickTag.setPath(path.resolve(process.cwd(), "./data/minecraft/tags/functions/tick.json"));
            tickTag.setContents(JSON.stringify({
                replace: false,
                values: [
                    "minecraft:__generated__/events/tick"
                ]
            }))
            tickTag.confirm();
        } else {
            super.confirm();
        }
    }



    static setEnv(_env) {
        env = _env;
    }
}



module.exports = { MCFunction, tickFunction, loadFunction }