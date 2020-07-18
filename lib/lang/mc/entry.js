const fs = require("fs");
const path = require("path");

const CONFIG = require("!config/mc");
const logger = require("!logger");
const CompilerError = require("!errors/CompilerError");

const { MCFunction, loadFunction, tickFunction } = require("./io");
const consumer = {};
const SRC_DIR = path.resolve(process.cwd() + "/src");
let id = 0;
let env = {};
let ifId = 0;
let namespaceStack = [];


const globalMacrosPath = path.resolve(SRC_DIR, CONFIG.globalMacrosFile);
let Macros = {};
function tryLoadMacros() {
  if (!Object.keys(Macros).length) {
    const tokens = tokenize(fs.readFileSync(globalMacrosPath, "utf-8")).map(token => {
      token.line = "macro@" + token.line;
      return token;
    });
    while (tokens.length) {
      const token = tokens.shift();
      if (token.token.startsWith("macro")) {
        const [, name] = token.token.split(" ");
        validate_next_destructive(tokens, "{");
        let match = 1;
        let macrotokens = [];
        let _token;
        do {
          _token = tokens.shift();
          if (_token.token === "{") {
            match++;
          } else if (_token.token === "}") {
            match--;
          }
          if (match) macrotokens.push(_token);
        } while (match && tokens.length);
        Macros[name] = macrotokens;
      } else {
        tokens.shift();
      }
    }
  }
}

const evaluate = (line) => {
  try {
    return new Function("return " + line).bind(env)();
  } catch (e) {
    return true;
  }
};

class Token {
  constructor(line, token) {
    this.line = line;
    this.token = token;
  }
  [Symbol.toStringTag]() {
    return this.token;
  }
}

const tokenize = (str) =>
  str.split("\n").reduce((p, n, index) => {
    n = n.trim();
    if (n[0] === "#") return p;
    if (!n) return p;
    if (n[0] === "}") {
      p.push(new Token(index, "}"));
      n = n.slice(1);
    }
    if (n[n.length - 1] === "{") {
      const v = n.slice(0, n.length - 1).trim();
      if (v) p.push(new Token(index, v));
      p.push(new Token(index, "{"));
    } else if (n) {
      p.push(new Token(index, n));
    }
    return p;
  }, []);

function validate_next_destructive(tokens, expect) {
  const token = tokens.shift();
  if (token && token.token != expect) {
    throw new CompilerError(
      `unexpected token '${token.token}' expected '${expect}'`,
      token.line
    );
  }
}

consumer.Namespace = (file, token, tokens) => {
  const name = token.substr("namespace ".length);
  namespaceStack.push(name.trim());
  validate_next_destructive(tokens, "{");
  while (tokens[0].token != "}") {
    consumer.Entry(file, tokens, true);
  }
  validate_next_destructive(tokens, "}");
  namespaceStack.pop();
};

consumer.Entry = (file, tokens, once) => {
  let breakout = false;
  while (tokens[0] && !breakout) {
    const { token } = tokens[0];
    if (/namespace .+/.test(token)) {
      consumer.Namespace(file, tokens.shift().token, tokens);
    } else if (/function .+/.test(token)) {
      consumer.Function(file, tokens);
    } else if (/clock .+/.test(token)) {
      const time = token.substr(6);
      const func = consumer.Function(file, tokens, {
        append: ["schedule function $block " + time],
      });
      loadFunction.set(file, ["function " + func.getReference()]);
    } else {
      tokens.shift();
      throw new CompilerError(
        `unexpected token '${token}' before ${
        tokens[0]
          ? tokens[0].token.length > 10
            ? tokens[0].token.substr(0, 10) + "..."
            : tokens[0].token
          : "EOF"
        }`,
        token.line
      );
    }
    breakout = once;
  }
};

consumer.Function = (file, tokens, opts = {}) => {
  const definition = tokens.shift();
  const [, name] = definition.token.split(" ");
  if (/[^a-z0-9_-]/.test(name)) {
    throw new CompilerError(
      "invalid function name '" + name + "'",
      definition.line
    );
  }
  const func = new MCFunction(undefined, undefined, name);
  func.namespace = namespaceStack[0];
  func.setPath(namespaceStack.slice(1).concat(name).join("/"));
  validate_next_destructive(tokens, "{");
  while (tokens[0].token != "}" && tokens[0]) {
    consumer.Generic(file, tokens, func, func, func);
  }
  validate_next_destructive(tokens, "}");
  if (opts.append) {
    for (let command of opts.append) {
      func.addCommand(command);
    }
  }
  func.confirm(file);
  return func;
};

consumer.Generic = (file, tokens, func, parent, functionalparent) => {
  let { token } = tokens.shift();
  if (token === "}") {
    return "#endblock";
  }
  if (token.startsWith("macro")) {
    const [, name, ...args] = token.split(" ");
    tryLoadMacros();
    if (Macros[name]) {
      const _tokens = [...Macros[name].map(_ => new Token(_.line, _.token))];
      for (let i = 0; i < _tokens.length; i++) {
        const t = _tokens[i];
        for (let j = 0; j < args.length; j++) {
          t.token = t.token.replace(new RegExp("\\$\\$" + j), args[j]);
        }
      }
      tokens.unshift(..._tokens);
    }
  } else if (/^execute\s*\(/.test(token)) {
    const condition = token.substring(token.indexOf("(") + 1, token.length - 1);
    func.addCommand(
      `scoreboard players set #execute ${CONFIG.internalScoreboard} 0`
    );
    func.addCommand(
      `execute ${condition} run ${consumer.Block(
        file,
        tokens,
        "conditional",
        {
          append: [`scoreboard players set #execute ${CONFIG.internalScoreboard} 1`],
        },
        parent,
        functionalparent
      )}`
    );
    const regex_elseif = /^else execute\s*\(/;
    while (regex_elseif.test(tokens[0].token)) {
      token = tokens.shift().token;
      const condition = token.substring(token.indexOf("(") + 1, token.length - 1);
      func.addCommand(
        `execute if score #execute ${
        CONFIG.internalScoreboard
        } matches 0 ${condition} run ${consumer.Block(
          file,
          tokens,
          "conditional",
          {
            append: [
              `scoreboard players set #execute ${CONFIG.internalScoreboard} 1`,
            ],
          },
          parent,
          functionalparent
        )}`
      );
    }
    if (/^else/.test(tokens[0].token)) {
      tokens.shift();
      func.addCommand(
        `execute if score #execute ${
        CONFIG.internalScoreboard
        } matches 0 run ${consumer.Block(
          file,
          tokens,
          "conditional",
          {},
          parent,
          functionalparent
        )}`
      );
    }
  } else if (/^!IF\(/.test(token)) {
    const condition = token.substr(4, token.length - 5);
    validate_next_destructive(tokens, "{");
    if (evaluate(condition)) {
      while (tokens[0].token != "}") {
        consumer.Generic(file, tokens, func);
      }
      validate_next_destructive(tokens, "}");
    } else {
      let count = 1;
      while (count && tokens.length) {
        let item = tokens.shift().token;
        if (item === "{") count++;
        if (item === "}") count--;
      }
    }
  } else if (/^!.+/.test(token)) {
    const condition = token.substr(1);
    validate_next_destructive(tokens, "{");
    if (evaluate("this." + condition)) {
      while (tokens[0].token != "}") {
        consumer.Generic(file, tokens, func);
      }
      validate_next_destructive(tokens, "}");
    } else {
      let count = 1;
      while (count && tokens.length) {
        let item = tokens.shift().token;
        if (item === "{") count++;
        if (item === "}") count--;
      }
    }
  } else if (/^block/.test(token)) {
    func.addCommand(consumer.Block(file, tokens, "block", {}, parent, null));
  } else if (token.endsWith("run") && token.startsWith("execute")) {
    func.addCommand(
      token + " " + consumer.Block(file, tokens, "execute", {}, parent, null)
    );
  } else if (/^LOOP/.test(token)) {
    consumer.Loop(file, token, tokens, func);
  } else if (/wait\s*\(/.test(token)) {
    const args = token.substr(5, token.length - 6);
    const cond = args.substr(0, args.lastIndexOf(",")).trim();
    const time = args.substr(args.lastIndexOf(",") + 1).trim();
    const call = consumer.Block(file, tokens, "wait", {}, parent, null);
    const waitFunc = new MCFunction();
    const name =
      "__generated__/wait/" +
      (id.wait = (id.wait == undefined ? -1 : id.wait) + 1);
    const _id = id.wait; Q
    waitFunc.namespace = namespaceStack[0];
    waitFunc.setPath(namespaceStack.slice(1).concat(name).join("/"));
    waitFunc.addCommand(
      `scoreboard players set #WAIT_COND_${_id} ${CONFIG.internalScoreboard} 0`
    );
    waitFunc.addCommand(
      `execute store success score #WAIT_COND_${_id} ${CONFIG.internalScoreboard} ${cond} run ${call}`
    );
    waitFunc.addCommand(
      `execute if score #WAIT_COND_${_id} ${CONFIG.internalScoreboard} matches 0 run schedule function $block ${time}`
    );
    waitFunc.confirm(file);
    func.addCommand(`function ${waitFunc.getReference()}`);
  } else if (/^async while/.test(token)) {
    const args = token.substr(12, token.length - 13);
    const cond = args.substr(0, args.lastIndexOf(",")).trim();
    const time = args.substr(args.lastIndexOf(",") + 1).trim();
    const whileFunc = new MCFunction();
    const name =
      "__generated__/while/" +
      (id.while = (id.while == undefined ? -1 : id.while) + 1);

    whileFunc.namespace = namespaceStack[0];
    whileFunc.setPath(namespaceStack.slice(1).concat(name).join("/"));
    const whileAction = consumer.Block(
      file,
      tokens,
      "while",
      {
        append: [
          `scoreboard players set #WHILE ${CONFIG.internalScoreboard} 1`,
          `schedule function ${whileFunc.getReference()} ${time}`,
        ],
      },
      parent,
      func
    );
    whileFunc.addCommand(`scoreboard players set #WHILE LANG_MC_INTERNAL 0`);
    whileFunc.addCommand(`execute ${cond} run ${whileAction}`);

    if (/^finally$/.test(tokens[0].token)) {
      token = tokens.shift().token;
      const whileFinally = consumer.Block(
        file,
        tokens,
        "while",
        {},
        whileFunc,
        func
      );
      whileFunc.addCommand(
        `execute if score #WHILE ${CONFIG.internalScoreboard} matches 0 run ${whileFinally}`
      );
    }

    whileFunc.confirm(file);
    func.addCommand(`function ${whileFunc.getReference()}`);
  } else if (/^while/.test(token)) {
    const args = token.substr(6, token.length - 7);
    const cond = args.trim();
    const whileFunc = new MCFunction();
    const name =
      "__generated__/while/" +
      (id.while = (id.while == undefined ? -1 : id.while) + 1);

    whileFunc.namespace = namespaceStack[0];
    whileFunc.setPath(namespaceStack.slice(1).concat(name).join("/"));
    const whileAction = consumer.Block(
      file,
      tokens,
      "while",
      {
        append: [
          `scoreboard players set #WHILE ${CONFIG.internalScoreboard} 1`,
          `function ${whileFunc.getReference()}`,
        ],
      },
      parent,
      func
    );
    whileFunc.addCommand(`scoreboard players set #WHILE LANG_MC_INTERNAL 0`);
    whileFunc.addCommand(`execute ${cond} run ${whileAction}`);

    if (/^finally$/.test(tokens[0].token)) {
      token = tokens.shift().token;
      const whileFinally = consumer.Block(
        file,
        tokens,
        "while",
        {},
        whileFunc,
        func
      );
      whileFunc.addCommand(
        `execute if score #WHILE ${CONFIG.internalScoreboard} matches 0 run ${whileFinally}`
      );
    }

    whileFunc.confirm(file);
    func.addCommand(`function ${whileFunc.getReference()}`);
  } else {
    func.addCommand(token);
  }
};

consumer.Block = (
  file,
  tokens,
  reason,
  opts = {},
  parent,
  functionalparent
) => {
  validate_next_destructive(tokens, "{");
  if (!reason) reason = "none";
  // just a clever way to only allocate a number if the namespace is used, allows me to define more namespaces as time goes on
  const name =
    "__generated__/" +
    reason +
    "/" +
    (id[reason] = (id[reason] == undefined ? -1 : id[reason]) + 1);
  const func = new MCFunction(parent, functionalparent);
  if (functionalparent === null) {
    functionalparent = func;
  }
  // func.namespace = path.parse(file).name;
  // func.setPath(name);
  func.namespace = namespaceStack[0];
  func.setPath(namespaceStack.slice(1).concat(name).join("/"));
  if (opts.prepend) {
    for (let command of opts.prepend) {
      func.addCommand(command);
    }
  }
  while (tokens[0].token != "}" && tokens[0]) {
    consumer.Generic(
      file,
      tokens,
      func,
      func,
      reason == "conditional" ? functionalparent : func
    );
  }
  if (opts.append) {
    for (let command of opts.append) {
      func.addCommand(command);
    }
  }
  validate_next_destructive(tokens, "}");
  func.confirm(file);
  return "function " + func.namespace + ":" + func.getFunctionPath();
};

consumer.Loop = (file, token, tokens, func) => {
  let [count, name] = token
    .substr(5, token.length - 6)
    .split(",")
    .map((_) => _.trim());
  count = evaluate(count);
  validate_next_destructive(tokens, "{");
  if (Array.isArray(count)) {
    for (let i = 0; i < count.length - 1; i++) {
      const copy = [...tokens];
      env[name] = count[i];
      while (copy[0].token != "}" && copy.length) {
        consumer.Generic(file, copy, func);
      }
    }
    env[name] = count[count.length - 1];
  } else {
    for (let i = 0; i < count - 1; i++) {
      const copy = [...tokens];
      env[name] = i;
      while (copy[0].token != "}" && copy.length) {
        consumer.Generic(file, copy, func);
      }
    }
    env[name] = count - 1;
  }
  while (tokens[0].token != "}" && tokens.length) {
    consumer.Generic(file, tokens, func);
  }
  validate_next_destructive(tokens, "}");
  delete env[name];
};

function MC_LANG_HANDLER(file) {
  Macros = {};
  const isMacroFile = file === globalMacrosPath;
  if (isMacroFile) {
    logger.info("not building macro file");
    return;
  }
  const location = path.relative(SRC_DIR, file);
  namespaceStack = [
    ...location
      .substr(0, location.length - 3)
      .replace(/\\/g, "/")
      .split("/"),
  ];
  if (CONFIG.defaultNamespace) {
    namespaceStack.unshift(CONFIG.defaultNamespace);
  }
  loadFunction.reset(file);
  tickFunction.reset(file);
  if (fs.existsSync(file)) {
    env = CONFIG;
    ifId = 0;
    MCFunction.setEnv(env);
    id = {};
    try {
      consumer.Entry(file, tokenize(fs.readFileSync(file, "utf8")));
    } catch (e) {
      console.log(e.stack);
      if (e.message === "Cannot read property 'token' of undefined") {
        throw new CompilerError("expected more tokens", "EOF");
      } else {
        throw e;
      }
    }
  }
}

module.exports = function MC(registry) {
  if (registry.has(".mc")) {
    return logger.error("handler registry already has extension '.mc'");
  }
  registry.set(".mc", MC_LANG_HANDLER);
  logger.info("registered handler or extension for '.mc'");

  return {
    exported: {
      io: {
        loadFunction,
        tickFunction,
        MCFunction,
      },
    },
  };
};
