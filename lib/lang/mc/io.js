const path = require("path");

const CompilerError = require("!errors/CompilerError");
const CONFIG = require("!config/mc");
const File = require("!io/File");

let env;

function evaluate(line) {
  if (line.indexOf("<%") > -1 && line.indexOf("%>")) {
    try {
      const template = line
        .replace(/\${/g, '${"${"}')
        .replace(/\\/g, "\\\\")
        .replace(/<%/g, "${")
        .replace(/%>/g, "}")
        .replace(/\`/g, "\\`");
      return new Function("return `" + template + "`").bind(env)();
    } catch (e) {
      return e.message;
    }
  }
  return line;
}

class MultiFile {
  constructor(file) {
    this.segments = {};
  }
  set(id, func) {
    this.segments[id] = this.segments[id] || [];
    this.segments[id].push(func);
  }
  values() {
    return Object.values(this.segments).flat();
  }
  reset(file) {
    delete this.segments[file];
  }
}
const tickFile = new File();
tickFile.setPath(
  path.resolve(
    process.cwd(),
    "./data/minecraft/functions/__generated__/events/tick.mcfunction"
  )
);
const tickFunction = new MultiFile(tickFile);
const loadFile = new File();
loadFile.setPath(
  path.resolve(
    process.cwd(),
    "./data/minecraft/functions/__generated__/events/load.mcfunction"
  )
);
const loadFunction = new MultiFile(loadFile);

class MCFunction extends File {
  constructor(parent, top, intent) {
    super();
    this.parent = parent;
    this.top = top || this;
    this.functions = [];
    this.namespace = "lang_error";
    this._path = Math.random().toString(36).substr(2);
    this.target = this;
    this.intent = intent;
  }
  addCommand(command) {
    this.functions.push(
      evaluate(
        command
          .replace(/\$block/g, this.namespace + ":" + this.getFunctionPath())
          .replace(/\$top/g, this.top.getReference())
          .replace(/\$parent/g, () => {
            if (this.parent) {
              return this.parent.getReference();
            } else {
              throw new CompilerError(
                "$parent used where there is no valid parent."
              );
            }
          })
      )
    );
  }
  getReference() {
    return this.namespace + ":" + this._path;
  }
  getContents() {
    return (CONFIG.header ? CONFIG.header + "\n\n" : "") + this.functions.join("\n");
  }
  getPath() {
    return path.resolve(
      process.cwd(),
      "./data/",
      this.namespace,
      "./functions/",
      this._path + ".mcfunction"
    );
  }
  getFunctionPath() {
    return this._path;
  }

  confirm(file) {
    if (this.intent === "load") {
      loadFunction.set(file, this.getReference());
    } else if (this.intent === "tick") {
      tickFunction.set(file, this.getReference());
    }
    super.confirm();
  }

  static setEnv(_env) {
    env = _env;
  }
}

module.exports = { MCFunction, tickFunction, loadFunction, loadFile, tickFile, evaluate_str: evaluate };
