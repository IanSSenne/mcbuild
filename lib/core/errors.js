class CompilerError extends Error {
  constructor(message, line = "unknown") {
    super(message);
    this.line = line;
  }
}

class CriticalError extends Error {}

module.exports = { CompilerError, CriticalError };
