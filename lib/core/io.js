const fs = require("fs");
const path = require("path");
const util = require("util");

const logger = require("./log");
const P_CONF = require("./persistent");
const error = require("./error_loggers");

const nextWriteActions = [];
const VFS = "INTERNAL/VIRTUAL_FILE_SYSTEM";
let VFS_STORED = P_CONF.has(VFS) ? P_CONF.get(VFS) : {};

//rewrite config to store in the case that its
P_CONF.set(VFS, VFS_STORED);

class File {
  getPath() {
    return this._path;
  }
  setPath(path) {
    this._path = path;
  }
  getContents() {
    return this._contents;
  }
  setContents(contents) {
    this._contents = contents;
  }
  confirm() {
    nextWriteActions.push(this);
  }
  unregister() {
    if (nextWriteActions.indexOf(this) != -1) {
      nextWriteActions.splice(nextWriteActions.indexOf(this), 1);
    }
  }
}

function rm(dir) {
  if (dir.endsWith("data") || !fs.existsSync(dir)) {
    return;
  }
  if (fs.readdirSync(dir).length === 0) {
    fs.rmdirSync(dir);
    rm(path.resolve(dir, "../"));
  }
}

function syncFSToVirtual(file) {
  if (file) {
    file = path.relative(process.cwd(), file);
    const virtual = (VFS_STORED[file] = VFS_STORED[file] || {});
    let existingFiles = new Set(Object.keys(virtual));
    const nextVirtual = {};
    while (nextWriteActions.length) {
      const file = nextWriteActions.shift();
      const loc = file.getPath();
      const parsed = path.parse(loc);
      if (!fs.existsSync(parsed.dir)) {
        fs.mkdirSync(parsed.dir, { recursive: true });
      }
      const contents = file.getContents();
      fs.writeFileSync(loc, contents);
      const stored_loc = path.relative(process.cwd(), loc);
      nextVirtual[stored_loc] = contents;
      existingFiles.delete(stored_loc);
    }
    const dirs = new Set();
    Array.from(existingFiles).forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
      dirs.add(path.parse(file).dir);
    });
    VFS_STORED[file] = nextVirtual;
    Array.from(dirs).forEach((dir) => {
      rm(dir);
    });
    if (nextVirtual.length === 0) {
      delete VFS_STORED[file];
    }
  } else {
    Object.entries(VFS_STORED).map(([file, assosiations]) => {
      if (!fs.existsSync(file) && file.indexOf("minecraft") === -1) {
        syncFSToVirtual(file);
      }
    });
  }
}

function addFile(file) {
  file.confirm();
}

function flush() {
  VFS_STORED = {};
  P_CONF.set(VFS, VFS_STORED);
}
module.exports = { File, syncFSToVirtual, addFile, flush };
