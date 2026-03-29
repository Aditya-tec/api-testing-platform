// src/config/env.js
// All environment variables are accessed through this file.
// Never import process.env directly elsewhere in the codebase.

require("dotenv").config();

const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/api-testing-platform",

  // Redis — used by BullMQ for the job queue
  // REDIS_URL takes precedence (for Upstash / serverless Redis)
  // Falls back to REDIS_HOST + REDIS_PORT for local development
  REDIS_URL: process.env.REDIS_URL || undefined,
  REDIS_HOST: process.env.REDIS_HOST || "127.0.0.1",
  REDIS_PORT: parseInt(process.env.REDIS_PORT, 10) || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  // Encryption key for stored credentials (auth tokens, API keys)
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ENCRYPTION_SECRET: process.env.ENCRYPTION_SECRET || "dev-secret-change-in-production-32chars!",
};

// Validate required vars at startup
const required = ["MONGO_URI"];
required.forEach((key) => {
  if (!env[key]) {
    console.error(`[env] Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

module.exports = env;