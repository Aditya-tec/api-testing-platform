// src/jobs/inlineWorker.js
// Starts the BullMQ worker inside the same process as the API server.
// Used on free hosting tiers (Render free web service) where a separate
// background worker process isn't available without a paid plan.
//
// Trade-off: worker and API share the same CPU/memory.
// Acceptable for demos and interviews. Use separate processes in production.

const { Worker } = require("bullmq");
const { getRedisConnection } = require("../config/redis");
const { JOB_QUEUE_NAME } = require("./queue");
const { executeJob } = require("../services/jobExecutor");
const logger = require("../utils/logger");
const env = require("../config/env");

const startInlineWorker = async () => {
  const worker = new Worker(
    JOB_QUEUE_NAME,
    async (bullJob) => {
      const { jobId } = bullJob.data;
      logger.info("[inline-worker] Processing job", { jobId });
      await executeJob(jobId);
    },
    {
      connection: getRedisConnection(),
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (bullJob) => {
    logger.info("[inline-worker] Job completed", { jobId: bullJob.data.jobId });
  });

  worker.on("failed", (bullJob, err) => {
    logger.error("[inline-worker] Job failed", {
      jobId: bullJob?.data?.jobId,
      error: err.message,
    });
  });

  worker.on("error", (err) => {
    logger.error("[inline-worker] Worker error", { error: err.message });
  });

  logger.info("[inline-worker] Worker running inside API process", {
    queue: JOB_QUEUE_NAME,
    concurrency: env.WORKER_CONCURRENCY,
  });

  return worker;
};

module.exports = { startInlineWorker };