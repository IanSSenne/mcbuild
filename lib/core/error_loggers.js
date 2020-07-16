const Chalk = require("chalk");

const logger = require("./log");

function critical(message, error, exit = true) {
  function center(message, size, fill) {
    const to_fill = (size - message.length) / 2;
    return (
      fill.repeat(Math.floor(to_fill)) +
      message +
      fill.repeat(Math.ceil(to_fill))
    );
  }
  const width =
    Math.max(
      message.length,
      error.message.length,
      process.stdout.columns - 27
    ) + 17;
  logger.error(
    Chalk.bold.redBright(
      `⠴${center(
        Chalk.bgRedBright.bold.yellow("[Critical Error]"),
        width + 30,
        "⠒"
      )}⠦`
    )
  );
  logger.error(`${Chalk.bold.redBright("⠇" + " ".repeat(width) + "⠸")}`);
  logger.error(
    `${Chalk.bold.redBright("⠇")}${center(
      "REASON",
      width,
      " "
    )}${Chalk.bold.redBright("⠸")}`
  );
  logger.error(
    `${Chalk.bold.redBright("⠇")}${center(
      message,
      width,
      " "
    )}${Chalk.bold.redBright("⠸")}`
  );
  logger.error(`${Chalk.bold.redBright("⠇" + " ".repeat(width) + "⠸")}`);
  logger.error(
    `${Chalk.bold.redBright("⠇")}${center(
      "ERROR",
      width,
      " "
    )}${Chalk.bold.redBright("⠸")}`
  );
  logger.error(
    `${Chalk.bold.redBright("⠇")}${center(
      error.message,
      width,
      " "
    )}${Chalk.bold.redBright("⠸")}`
  );
  logger.error(`${Chalk.bold.redBright("⠇" + " ".repeat(width) + "⠸")}`);
  logger.error(Chalk.bold.redBright(`⠙${"⠒".repeat(width)}⠋`));
  if (message === "unknown error") {
    console.log(error);
  }
  if (exit) process.exit(message);
}

function compiler(error) {
  function center(message, size, fill) {
    const to_fill = (size - message.length) / 2;
    return (
      fill.repeat(Math.floor(to_fill)) +
      message +
      fill.repeat(Math.ceil(to_fill))
    );
  }
  const width = Math.max(error.message.length, process.stdout.columns - 10);
  logger.error(
    Chalk.bold.redBright(
      `⠴${center(Chalk.bold.black("[Compiler Error]"), width + 19, "⠒")}⠦`
    )
  );
  logger.error(`${Chalk.bold.redBright("⠇" + " ".repeat(width) + "⠸")}`);
  logger.error(
    `${Chalk.bold.redBright("⠇" + center(error.message, width, " ") + "⠸")}`
  );
  logger.error(
    `${Chalk.bold.redBright(
      "⠇" + center("line:" + error.line, width, " ") + "⠸"
    )}`
  );
  logger.error(`${Chalk.bold.redBright("⠇" + " ".repeat(width) + "⠸")}`);
  logger.error(Chalk.bold.redBright(`⠙${"⠒".repeat(width)}⠋`));
}

module.exports = { critical, compiler };
