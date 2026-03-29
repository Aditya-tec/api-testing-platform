// src/services/jobExecutor.js
// Orchestrates execution of ALL requests in a job, in order.
// Called by the worker for every dequeued job.
//
// Responsibilities:
//   - transition job status (PENDING → RUNNING → COMPLETED / PARTIAL / FAILED)
//   - iterate through requestsSnapshot sequentially
//   - call requestExecutor for each request
//   - persist RequestResult documents
//   - write structured Log events
//   - handle SKIP logic for sequential failures
//   - persist extracted variables back to the Job document

const Job = require("../models/Job.model");
const RequestResult = require("../models/RequestResult.model");
const Log = require("../models/Log.model");
const { LOG_EVENTS } = require("../models/Log.model");
const { executeRequest } = require("./requestExecutor");
const logger = require("../utils/logger");

/**
 * Derive final job status from all RequestResult statuses.
 *
 *   All COMPLETED               → COMPLETED
 *   All FAILED                  → FAILED
 *   Mix of COMPLETED + FAILED   → PARTIAL
 *   Any SKIPPED present         → PARTIAL (some requests never ran)
 */
const deriveJobStatus = (results) => {
  const statuses = results.map((r) => r.status);
  const allCompleted = statuses.every((s) => s === "COMPLETED");
  const allFailed = statuses.every((s) => s === "FAILED");
  if (allCompleted) return "COMPLETED";
  if (allFailed) return "FAILED";
  return "PARTIAL";
};

/**
 * Main entry point called by the worker.
 *
 * @param {string} jobId - MongoDB ObjectId string
 */
const executeJob = async (jobId) => {
  const job = await Job.findById(jobId);

  if (!job) {
    logger.error("[executor] Job not found", { jobId });
    return;
  }

  if (job.status !== "PENDING") {
    logger.warn("[executor] Job is not PENDING, skipping", { jobId, status: job.status });
    return;
  }

  // ── Transition: PENDING → RUNNING ────────────────────────────────────────
  await Job.findByIdAndUpdate(jobId, { status: "RUNNING", startedAt: new Date() });
  await Log.create({
    jobId,
    event: LOG_EVENTS.JOB_STARTED,
    meta: { message: "Worker picked up job", totalRequests: job.requestsSnapshot.length },
  });

  logger.info("[executor] Job RUNNING", { jobId, totalRequests: job.requestsSnapshot.length });

  // ── Build variable store ─────────────────────────────────────────────────
  const variables = new Map(Object.entries(Object.fromEntries(job.variables || [])));

  // ── Fetch pre-created RequestResult stubs ────────────────────────────────
  const requestResults = await RequestResult.find({ jobId }).sort({ requestIndex: 1 });

  let shouldAbort = false;

  try {
    for (const requestDef of job.requestsSnapshot) {
      const resultDoc = requestResults.find((r) => r.requestIndex === requestDef.index);

      if (!resultDoc) {
        logger.error("[executor] No RequestResult found for index", { jobId, index: requestDef.index });
        continue;
      }

      // ── SKIP if prior request failed (sequential mode) ────────────────────
      if (shouldAbort && job.executionMode === "sequential") {
        await RequestResult.findByIdAndUpdate(resultDoc._id, { status: "SKIPPED" });
        await Log.create({
          jobId,
          event: LOG_EVENTS.REQUEST_SKIPPED,
          meta: { requestIndex: requestDef.index, requestName: requestDef.name, reason: "Prior request failed" },
        });
        logger.info("[executor] Request SKIPPED", { jobId, requestName: requestDef.name });
        continue;
      }

      // ── Transition: PENDING → RUNNING ─────────────────────────────────────
      await RequestResult.findByIdAndUpdate(resultDoc._id, { status: "RUNNING", startedAt: new Date() });
      await Log.create({
        jobId,
        requestResultId: resultDoc._id,
        event: LOG_EVENTS.REQUEST_STARTED,
        meta: { requestIndex: requestDef.index, requestName: requestDef.name },
      });

      // ── Fire the request ─────────────────────────────────────────────────
      const result = await executeRequest(
        requestDef,
        job.authSnapshot,
        variables,
        3,
        // onRetry: fires before each retry attempt — writes an auditable log entry
        async (attempt, reason) => {
          try {
            await Log.create({
              jobId,
              requestResultId: resultDoc._id,
              event: LOG_EVENTS.REQUEST_RETRYING,
              meta: { requestName: requestDef.name, attempt, reason },
            });
          } catch (logErr) {
            logger.warn("[executor] Failed to write retry log", { error: logErr.message });
          }
        }
      );

      // ── Log variable extractions ─────────────────────────────────────────
      for (const extracted of result.extractedVars) {
        await Log.create({
          jobId,
          requestResultId: resultDoc._id,
          event: LOG_EVENTS.VAR_EXTRACTED,
          meta: { variable: extracted.variable, value: extracted.value, fromRequestIndex: requestDef.index },
        });
      }

      // ── Persist RequestResult ────────────────────────────────────────────
      await RequestResult.findByIdAndUpdate(resultDoc._id, {
        status: result.status,
        httpStatus: result.httpStatus,
        latencyMs: result.latencyMs,
        responseSnippet: result.responseSnippet,
        errorMessage: result.errorMessage,
        retryCount: result.retryCount,
        startedAt: result.startedAt,
        completedAt: result.completedAt,
      });

      // ── Log the outcome ──────────────────────────────────────────────────
      if (result.status === "COMPLETED") {
        await Log.create({
          jobId,
          requestResultId: resultDoc._id,
          event: LOG_EVENTS.REQUEST_COMPLETED,
          meta: { requestName: requestDef.name, httpStatus: result.httpStatus, latencyMs: result.latencyMs, retryCount: result.retryCount },
        });
        logger.info("[executor] Request COMPLETED", { jobId, requestName: requestDef.name, httpStatus: result.httpStatus, latencyMs: result.latencyMs });
      } else {
        await Log.create({
          jobId,
          requestResultId: resultDoc._id,
          event: LOG_EVENTS.REQUEST_FAILED,
          meta: { requestName: requestDef.name, error: result.errorMessage, retryCount: result.retryCount },
        });
        logger.warn("[executor] Request FAILED", { jobId, requestName: requestDef.name, error: result.errorMessage });

        if (job.executionMode === "sequential") shouldAbort = true;
      }
    }

    // ── Persist final variable state ─────────────────────────────────────────
    await Job.findByIdAndUpdate(jobId, { variables: Object.fromEntries(variables) });

    // ── Derive and persist final job status ──────────────────────────────────
    const updatedResults = await RequestResult.find({ jobId });
    const finalStatus = deriveJobStatus(updatedResults);

    await Job.findByIdAndUpdate(jobId, { status: finalStatus, completedAt: new Date() });

    const finalLogEvent =
      finalStatus === "COMPLETED" ? LOG_EVENTS.JOB_COMPLETED :
      finalStatus === "PARTIAL"   ? LOG_EVENTS.JOB_PARTIAL   :
                                    LOG_EVENTS.JOB_FAILED;

    await Log.create({
      jobId,
      event: finalLogEvent,
      meta: { finalStatus, totalRequests: job.requestsSnapshot.length },
    });

    logger.info("[executor] Job finished", { jobId, finalStatus });

  } catch (err) {
    await Job.findByIdAndUpdate(jobId, { status: "FAILED", completedAt: new Date() });
    await Log.create({ jobId, event: LOG_EVENTS.JOB_FAILED, meta: { error: err.message, stage: "executor_crash" } });
    logger.error("[executor] Unexpected crash", { jobId, error: err.message });
    throw err;
  }
};

module.exports = { executeJob };