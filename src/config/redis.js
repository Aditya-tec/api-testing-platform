// src/config/redis.js
// Shared Redis connection config used by both the Queue (API server)
// and the Worker (separate process).
//
// BullMQ requires two separate connections:
//   - one for the Queue (publishing jobs)
//   - one for the Worker (consuming jobs)
// We export a factory function so each caller creates its own connection.

const { Redis } = require("ioredis");
const env = require("./env");

const getRedisConnection = () => {
  // Priority 1: Full Redis URL (Upstash / serverless)
  // Priority 2: Host + port + password (local development)
  let connection;

  if (env.REDIS_URL) {
    connection = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,    // required by BullMQ
    });
  } else {
    connection = new Redis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      maxRetriesPerRequest: null, // required by BullMQ
      enableReadyCheck: false,    // required by BullMQ
    });
  }

  connection.on("connect", () => {
    const target = env.REDIS_URL ? "Upstash [TLS]" : `${env.REDIS_HOST}:${env.REDIS_PORT}`;
    console.log(`[redis] Connected to ${target}`);
  });

  connection.on("error", (err) => {
    console.error(`[redis] Error: ${err.message}`);
  });

  return connection;
};

module.exports = { getRedisConnection };