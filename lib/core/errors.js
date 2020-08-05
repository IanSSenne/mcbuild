class CompilerError extends Error {
  constructor(message, line = "unknown") {
    super(message);
    this.line = line;
  }
}

class CriticalError extends Error { }

class UserError extends Error {
  constructor(message, line = "unknown") {
    super(message);
    this.line = line;
  }
}

module.exports = { CompilerError, CriticalError, UserError };
