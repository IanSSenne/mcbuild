const fs = require("fs");
const bson = require("bson");
const path = require("path");

const logger = require("./log");
const CROSS_RUN_PATH = path.resolve(process.cwd(), "./.mcproject/.CROSS_RUN");
const SAVE_DIR = path.resolve(process.cwd(), "./.mcproject");

let FLAG_IS_EXITING = false;
let DATA = null;

const EXIT_HANDLER = (code, ...rest) => {
  if (!FLAG_IS_EXITING) {
    logger.info(
      `shutdown signal recieved (${`${code} ${rest.join(" ")}`.trim()})`
    );
    FLAG_IS_EXITING = true;
    logger.info("writing cross run data to disk");
    if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR);
    fs.writeFileSync(
      CROSS_RUN_PATH,
      bson.serialize(Array.from(DATA.entries()))
    );
    logger.info("exiting...");
    process.exit(code);
  }
};

if (fs.existsSync(CROSS_RUN_PATH)) {
  DATA = new Map(
    Object.values(bson.deserialize(fs.readFileSync(CROSS_RUN_PATH)))
  );
  DATA.set("lastUpdate", new Date().toString());
} else {
  DATA = new Map([["lastUpdate", new Date().toString()]]);
}

process.on("exit", EXIT_HANDLER);
process.on("SIGINT", EXIT_HANDLER);
process.on("uncaughtException", EXIT_HANDLER);

module.exports = DATA;

// lets not use these as they may break debugging. / prod only?
// process.on("SIGUSR1", EXIT_HANDLER);
// process.on("SIGUSR2", EXIT_HANDLER);
