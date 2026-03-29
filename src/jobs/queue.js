// src/jobs/queue.js
// The Queue is used by the API server to ADD jobs.
// The Worker (worker.js) is what CONSUMES them.
// Keep these as separate files — they run in separate processes.

const { Queue } = require("bullmq");
const { getRedisConnection } = require("../config/redis");

const JOB_QUEUE_NAME = "job-execution";

// One Queue instance per API server process
const jobQueue = new Queue(JOB_QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 3,               // retry failed jobs up to 3 times
    backoff: {
      type: "exponential",     // wait doubles each retry: 1s, 2s, 4s
      delay: 1000,
    },
    removeOnComplete: {
      count: 100,              // keep last 100 completed jobs in Redis for inspection
    },
    removeOnFail: {
      count: 200,              // keep last 200 failed jobs for debugging
    },
  },
});

/**
 * Enqueue a job by its MongoDB Job document ID.
 * The worker fetches the full job from MongoDB — queue payload is intentionally lean.
 *
 * @param {string} jobId - MongoDB ObjectId string
 * @returns {Promise<Job>} BullMQ Job instance
 */
const enqueueJob = async (jobId) => {
  const bullJob = await jobQueue.add(
    "execute-collection",     // job name (useful for filtering in BullMQ dashboard)
    { jobId },                // minimal payload — worker fetches rest from DB
    { jobId }                 // use MongoDB jobId as BullMQ job ID for traceability
  );

  return bullJob;
};

module.exports = { jobQueue, enqueueJob, JOB_QUEUE_NAME };