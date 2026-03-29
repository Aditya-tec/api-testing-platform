// src/server.js
// Boots the HTTP server and connects to MongoDB.
// Handles graceful shutdown on SIGTERM and SIGINT (Ctrl+C).

const app = require("./app");
const { connectDB, disconnectDB } = require("./config/db");
const env = require("./config/env");
const logger = require("./utils/logger");

const startServer = async () => {
  await connectDB();

  // Start inline worker if enabled (for free Render tier)
  if (env.INLINE_WORKER === "true") {
    const { startInlineWorker } = require("./jobs/inlineWorker");
    startInlineWorker();
    logger.info("Inline worker started");
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running`, { port: env.PORT, env: env.NODE_ENV });
  });

  // ─── Graceful shutdown ────────────────────────────────────────────────────
  // On shutdown signal: stop accepting new connections, finish in-flight requests,
  // then disconnect from DB. This prevents data loss on deployment restarts.
  const shutdown = async (signal) => {
    logger.info(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await disconnectDB();
      logger.info("Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Catch unhandled promise rejections — log and exit so the process restarts cleanly
  process.on("unhandledRejection", (err) => {
    logger.error("Unhandled rejection", { message: err.message, stack: err.stack });
    shutdown("unhandledRejection");
  });
};

startServer();