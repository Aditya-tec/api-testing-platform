// src/utils/logger.js
// A thin wrapper around console that adds timestamps and log levels.
// We keep this simple for now. In production you'd swap this for winston or pino.

const env = require("../config/env");

const timestamp = () => new Date().toISOString();

const logger = {
  info: (message, meta = {}) => {
    console.log(JSON.stringify({ level: "info", message, ...meta, ts: timestamp() }));
  },
  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({ level: "warn", message, ...meta, ts: timestamp() }));
  },
  error: (message, meta = {}) => {
    console.error(JSON.stringify({ level: "error", message, ...meta, ts: timestamp() }));
  },
  debug: (message, meta = {}) => {
    if (env.NODE_ENV === "development") {
      console.debug(JSON.stringify({ level: "debug", message, ...meta, ts: timestamp() }));
    }
  },
};

module.exports = logger;