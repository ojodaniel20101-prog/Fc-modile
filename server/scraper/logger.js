import fs from "fs";
import path from "path";
import config from "./config.js";

class Logger {
  constructor() {
    this.logPath = config.LOG_PATH;
    const dir = path.dirname(this.logPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _write(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, level, message, ...meta };
    const line = JSON.stringify(logEntry) + "\n";

    try {
      fs.appendFileSync(this.logPath, line);
    } catch {
      // If disk write fails (e.g. read-only fs), don't crash the request
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[${timestamp}] [${level}] ${message}`, meta);
    }
  }

  info(message, meta) {
    this._write("INFO", message, meta);
  }

  warn(message, meta) {
    this._write("WARN", message, meta);
  }

  error(message, meta) {
    this._write("ERROR", message, meta);
  }

  debug(message, meta) {
    if (process.env.NODE_ENV !== "production") {
      this._write("DEBUG", message, meta);
    }
  }
}

export default new Logger();
