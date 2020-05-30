const fs = require("fs");
const path = require("path");


const CONFIG = require("!config/mc");
const logger = require("!logger");
const CompilerError = require("!errors/CompilerError");



const { MCFunction, loadFunction, tickFunction } = require("./io");
const consumer = {};
let id = 0;
let env = {};
let ifId = 0;


const evaluate = line => {
    try {
        return (new Function("return " + line)).bind(env)();
    } catch (e) {
        return true;
    }
}



class Token {
    constructor(line, token) {
        this.line = line;
        this.token = token;
    }
    [Symbol.toStringTag]() {
        return this.token;
    }
}



const tokenize = str => str.split('\n').reduce((p, n, index) => {
    n = n.trim();
    if (n[0] === "#") return p;
    if (!n) return p;
    if (n[0] === '}') {
        p.push(new Token(index, '}'));
        n = n.slice(1);
    }
    if (n[n.length - 1] === '{') {
        const v = n.slice(0, n.length - 1).trim();
        if (v) p.push(new Token(index, v));
        p.push(new Token(index, '{'));
    }
    else if (n) {
        p.push(new Token(index, n));
    }
    return p;
}, []);



function validate_next_destructive(tokens, expect) {
    const { token } = tokens.shift();
    if (token != expect) {
        throw new CompilerError(`unexpected token '${token}' expected '${expect}'`);
    }
}



consumer.Entry = (file, tokens) => {

    while (tokens[0]) {
        const { token } = tokens[0];
        if (/function .+/.test(token)) {
            consumer.Function(file, tokens);
        } else if (/clock .+/.test(token)) {
            const time = token.substr(6);
            const func = consumer.Function(file, tokens, { append: ["schedule function $block " + time] });
            loadFunction.set(file, ["function " + func.getReference()]);
        } else {
            tokens.shift();
            throw new CompilerError(`unexpected token '${token}' before ${tokens[0] ? tokens[0].token.length > 10 ? tokens[0].token.substr(0, 10) + "..." : tokens[0].token : "EOF"}`, token.line);
        }
    }
}



consumer.Function = (file, tokens, opts = {}) => {
    const func = new MCFunction();
    const definition = tokens.shift();
    const [, name] = definition.token.split(" ");
    func.namespace = path.parse(file).name
    func.setPath(name);
    validate_next_destructive(tokens, "{");
    while (tokens[0].token != "}" && tokens[0]) {
        consumer.Generic(file, tokens, func);
    }
    validate_next_destructive(tokens, "}");
    if (opts.append) {
        for (let command of opts.append) {
            func.addCommand(command);
        }
    }
    func.confirm(file);
    return func;
}



consumer.Generic = (file, tokens, func) => {
    let { token } = tokens.shift();
    if (token === "}") {
        return "#endblock";
    }
    if (/^if\s*\(/.test(token)) {
        const thisIfId = ifId++;
        const condition = token.substr(3, token.length - 4);
        func.addCommand(`scoreboard players set #MC_INT_IF_${thisIfId} ${CONFIG.internalScoreboard} 0`)
        func.addCommand(`execute store success score #MC_INT_IF_${thisIfId} ${CONFIG.internalScoreboard} ${condition} run ${consumer.Block(file, tokens, "conditional")}`);
        const regex_elseif = /^else if\s*\(/;
        const regex_else = /^else/;
        while (regex_elseif.test(tokens[0].token)) {
            token = tokens.shift().token;
            const condition = token.substr(8, token.length - 9);
            func.addCommand(`execute if score #MC_INT_IF_${thisIfId} ${CONFIG.internalScoreboard} matches 0 store success score #MC_INT_IF_${thisIfId} ${CONFIG.internalScoreboard} if ${condition} run ${consumer.Block(file, tokens, "conditional")}`);
        }
        if (/^else/.test(tokens[0].token)) {
            tokens.shift();
            func.addCommand(`execute if score #MC_INT_IF_${thisIfId} ${CONFIG.internalScoreboard} matches 0 run ${consumer.Block(file, tokens, "conditional")}`);
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
            while (tokens[0] != "}") {
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
    } else if (/^inline/.test(token)) {
        func.addCommand(consumer.Block(file, tokens, "inline"));
    } else if (token.endsWith("run") && token.startsWith("execute")) {
        func.addCommand(token + " " + consumer.Block(file, tokens, "execute"));
    } else if (/^LOOP/.test(token)) {
        consumer.Loop(file, token, tokens, func);
    } else if (/wait\s*\(/.test(token)) {
        const args = token.substr(5, token.length - 6);
        const cond = args.substr(0, args.lastIndexOf(",")).trim();
        const time = args.substr(args.lastIndexOf(",") + 1).trim();
        const call = consumer.Block(file, tokens, "wait");
        const waitFunc = new MCFunction();
        const name = "__generated__/wait/" + (id.wait = (id.wait == undefined ? -1 : id.wait) + 1);
        const _id = id.wait;

        waitFunc.namespace = path.parse(file).name;
        waitFunc.setPath(name);
        waitFunc.addCommand(`scoreboard players set #WAIT_COND_${_id} ${CONFIG.internalScoreboard} 0`);
        waitFunc.addCommand(`execute store success score #WAIT_COND_${_id} ${CONFIG.internalScoreboard} ${cond} run ${call}`);
        waitFunc.addCommand(`execute if score #WAIT_COND_${_id} ${CONFIG.internalScoreboard} matches 0 run schedule function $block ${time}`);
        waitFunc.confirm(file);
        func.addCommand(`function ${waitFunc.getReference()}`);
    } else {
        func.addCommand(token);
    }
}



consumer.Block = (file, tokens, reason, opts = {}) => {
    validate_next_destructive(tokens, "{");
    if (!reason) reason = "none";
    // just a clever way to only allocate a number if the namespace is used, allows me to define more namespaces as time goes on
    const name = "__generated__/" + reason + "/" + (id[reason] = (id[reason] == undefined ? -1 : id[reason]) + 1);
    const func = new MCFunction();
    func.namespace = path.parse(file).name;
    func.setPath(name);
    if (opts.prepend) {
        for (let command of opts.prepend) {
            func.addCommand(command);
        }
    }
    while (tokens[0].token != "}" && tokens[0]) {
        consumer.Generic(file, tokens, func)
    }
    if (opts.append) {
        for (let command of opts.append) {
            func.addCommand(command);
        }
    }
    validate_next_destructive(tokens, "}");
    func.confirm(file);
    return "function " + func.namespace + ":" + func.getFunctionPath();
}



consumer.Loop = (file, token, tokens, func) => {
    const [count, name] = token.substr(5, token.length - 6).split(",");
    validate_next_destructive(tokens, "{");
    for (let i = 0; i < count - 1; i++) {
        const copy = [...tokens];
        env[name] = i;
        while (copy[0].token != "}" && copy.length) {
            consumer.Generic(file, copy, func);
        }
    }
    env[name] = count - 1;
    while (tokens[0].token != "}" && tokens.length) {
        consumer.Generic(file, tokens, func);
    }
    validate_next_destructive(tokens, "}");
    delete env[name];
}



function MC_LANG_HANDLER(file) {
    loadFunction.reset(file);
    tickFunction.reset(file);
    if (fs.existsSync(file)) {
        env = CONFIG;
        ifId = 0;
        MCFunction.setEnv(env);
        id = {};
        logger.task("build mc file: " + file);
        consumer.Entry(file, tokenize(fs.readFileSync(file, 'utf8')))
    }
}



module.exports = function MC(registry) {
    env = module.exports.config;
    if (registry.has(".mc")) {
        return logger.error("handler registry already has extension '.mc'");
    }
    registry.set(".mc", MC_LANG_HANDLER);
    logger.info("registered handler or extension for '.mc'");
}

