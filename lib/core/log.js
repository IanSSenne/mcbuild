const chalk = require("chalk");

const ERR = chalk.white("[") + chalk.redBright(" err ") + chalk.white("] ");
const WRN = chalk.white("[") + chalk.yellowBright(" wrn ") + chalk.white("] ");
const LOG = chalk.white("[") + chalk.green(" log ") + chalk.white("] ");
const INF = chalk.white("[") + chalk.gray(" inf ") + chalk.white("] ");
const TSK = chalk.white("[") + chalk.cyan(" tsk ") + chalk.white("] ");

module.exports.log = (...args) => console.log(LOG + args.join(" "));
module.exports.error = (...args) => {
  console.log(ERR + args.join(" "));
};
module.exports.warn = (...args) => console.log(WRN + args.join(" "));
module.exports.info = (...args) => console.log(INF + args.join(" "));
module.exports.task = (...args) => console.log(TSK + args.join(" "));
