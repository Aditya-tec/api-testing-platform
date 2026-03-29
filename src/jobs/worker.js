// src/jobs/worker.js
// The Worker runs as a SEPARATE PROCESS from the API server.
// It listens to the BullMQ queue and executes jobs one by one.
//
// Start it with: node src/jobs/worker.js
// In production, run it alongside the API server (separate Render/Railway service).

require("dotenv").config();
require("express-async-errors"); // not strictly needed here but keeps error behavior consistent

const { Worker } = require("bullmq");
const { getRedisConnection } = require("../config/redis");
const { connectDB } = require("../config/db");
const { JOB_QUEUE_NAME } = require("./queue");
const { executeJob } = require("../services/jobExecutor");
const logger = require("../utils/logger");

// ─── Boot ─────────────────────────────────────────────────────────────────────
const startWorker = async () => {
  // Worker needs its own DB connection — it's a separate process
  await connectDB();

  const worker = new Worker(
    JOB_QUEUE_NAME,
    async (bullJob) => {
      // bullJob.data = { jobId } — the MongoDB Job document ID
      const { jobId } = bullJob.data;
      logger.info("[worker] Processing job", { jobId, bullJobId: bullJob.id });

      // This is where execution happens — Phase 3 fills this in
      await executeJob(jobId);
    },
    {
      connection: getRedisConnection(),
      concurrency: 5, // process up to 5 jobs simultaneously
    }
  );

  // ─── Worker event hooks ──────────────────────────────────────────────────
  worker.on("completed", (bullJob) => {
    logger.info("[worker] Job completed", { jobId: bullJob.data.jobId });
  });

  worker.on("failed", (bullJob, err) => {
    logger.error("[worker] Job failed", {
      jobId: bullJob?.data?.jobId,
      error: err.message,
      attempt: bullJob?.attemptsMade,
    });
  });

  worker.on("error", (err) => {
    logger.error("[worker] Worker error", { error: err.message });
  });

  logger.info("[worker] Worker started and listening for jobs", {
    queue: JOB_QUEUE_NAME,
    concurrency: 5,
  });

  // ─── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`[worker] ${signal} received — closing worker`);
    await worker.close();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

startWorker().catch((err) => {
  logger.error("[worker] Failed to start", { error: err.message });
  process.exit(1);
});