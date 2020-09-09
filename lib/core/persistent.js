const fs = require("fs");
const path = require("path");

const logger = require("./log");
const CROSS_RUN_PATH = path.resolve(process.cwd(), "./.mcproject/CROSS_RUN.json");
const SAVE_DIR = path.resolve(process.cwd(), "./.mcproject");
if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR);
let FLAG_IS_EXITING = false;
let DATA = null;

const EXIT_HANDLER = (code, ...rest) => {
  if (!FLAG_IS_EXITING) {
    logger.info(
      `shutdown signal recieved (${`${code} ${rest.join(" ")}`.trim()})`
    );
    FLAG_IS_EXITING = true;
    logger.info("writing cross run data to disk");
    fs.writeFileSync(
      CROSS_RUN_PATH,
      JSON.stringify(Array.from(DATA.entries()), null, 2)
    );
    logger.info("exiting...");
    process.exit(code);
  }
};

if (fs.existsSync(CROSS_RUN_PATH)) {
  DATA = new Map(
    Object.values(JSON.parse(fs.readFileSync(CROSS_RUN_PATH)))
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
