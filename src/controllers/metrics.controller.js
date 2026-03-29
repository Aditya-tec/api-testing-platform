// src/controllers/metrics.controller.js
// Provides observability endpoints for the dashboard and interviews.
//
// Two levels:
//   GET /metrics              — global system-wide stats
//   GET /collections/:id/metrics — per-collection stats across all its job runs
//
// All aggregations run via MongoDB aggregation pipelines — no in-memory loops.
// This is intentional: shows DB-level thinking, not just JS math.

const Job = require("../models/Job.model");
const RequestResult = require("../models/RequestResult.model");
const Collection = require("../models/Collection.model");

// ─── GET /api/v1/metrics ──────────────────────────────────────────────────────
// Global snapshot of the entire system.

const getGlobalMetrics = async (req, res) => {
  const [jobStats, requestStats, recentFailures] = await Promise.all([

    // ── Job-level breakdown ──────────────────────────────────────────────────
    Job.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // ── Request-level breakdown + avg latency ────────────────────────────────
    RequestResult.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgLatencyMs: {
            $avg: {
              // Only average latency for completed requests (others are null)
              $cond: [{ $eq: ["$status", "COMPLETED"] }, "$latencyMs", null],
            },
          },
        },
      },
    ]),

    // ── Last 5 failed jobs for quick debugging ───────────────────────────────
    Job.find({ status: { $in: ["FAILED", "PARTIAL"] } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id collectionId status createdAt completedAt")
      .populate("collectionId", "name"),
  ]);

  // Reshape job stats array into a readable object
  const jobCounts = { PENDING: 0, RUNNING: 0, COMPLETED: 0, PARTIAL: 0, FAILED: 0 };
  jobStats.forEach(({ _id, count }) => { jobCounts[_id] = count; });
  const totalJobs = Object.values(jobCounts).reduce((a, b) => a + b, 0);

  // Reshape request stats
  const requestCounts = { PENDING: 0, RUNNING: 0, COMPLETED: 0, FAILED: 0, SKIPPED: 0 };
  let avgLatencyMs = null;
  let latencySum = 0;
  let latencyCount = 0;

  requestStats.forEach(({ _id, count, avgLatencyMs: avg }) => {
    requestCounts[_id] = count;
    if (_id === "COMPLETED" && avg != null) {
      latencySum = avg * count;
      latencyCount = count;
    }
  });

  if (latencyCount > 0) {
    avgLatencyMs = Math.round(latencySum / latencyCount);
  }

  const successRate = totalJobs > 0
    ? Math.round((jobCounts.COMPLETED / totalJobs) * 100)
    : null;

  res.status(200).json({
    success: true,
    data: {
      jobs: {
        total: totalJobs,
        byStatus: jobCounts,
        successRate: successRate !== null ? `${successRate}%` : "N/A",
      },
      requests: {
        total: Object.values(requestCounts).reduce((a, b) => a + b, 0),
        byStatus: requestCounts,
        avgLatencyMs,
      },
      recentFailures,
    },
  });
};

// ─── GET /api/v1/collections/:id/metrics ─────────────────────────────────────
// Per-collection stats — how has this collection performed across all its runs?

const getCollectionMetrics = async (req, res) => {
  const { id: collectionId } = req.params;

  const collection = await Collection.findById(collectionId).select("name executionMode");
  if (!collection) {
    return res.status(404).json({ success: false, error: "Collection not found" });
  }

  const [jobStats, requestStats, latencyByRequest, last10Jobs] = await Promise.all([

    // ── Job-level summary for this collection ─────────────────────────────
    Job.aggregate([
      { $match: { collectionId: collection._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgDurationMs: { $avg: { $subtract: ["$completedAt", "$startedAt"] } },
        },
      },
    ]),

    // ── All request results across all jobs for this collection ───────────
    RequestResult.aggregate([
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      { $match: { "job.collectionId": collection._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // ── Avg latency per request NAME across all runs ───────────────────────
    // Answers: "which specific request in this collection is slowest?"
    RequestResult.aggregate([
      {
        $lookup: {
          from: "jobs",
          localField: "jobId",
          foreignField: "_id",
          as: "job",
        },
      },
      { $unwind: "$job" },
      {
        $match: {
          "job.collectionId": collection._id,
          status: "COMPLETED",
          latencyMs: { $ne: null },
        },
      },
      {
        $group: {
          _id: { index: "$requestIndex", name: "$requestName" },
          avgLatencyMs: { $avg: "$latencyMs" },
          minLatencyMs: { $min: "$latencyMs" },
          maxLatencyMs: { $max: "$latencyMs" },
          totalRuns: { $sum: 1 },
        },
      },
      { $sort: { "_id.index": 1 } },
    ]),

    // ── Last 10 job runs for this collection ──────────────────────────────
    Job.find({ collectionId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("_id status startedAt completedAt createdAt")
      .lean()
      .then((jobs) =>
        jobs.map((j) => ({
          ...j,
          durationMs:
            j.startedAt && j.completedAt ? j.completedAt - j.startedAt : null,
        }))
      ),
  ]);

  // Reshape job stats
  const jobCounts = { PENDING: 0, RUNNING: 0, COMPLETED: 0, PARTIAL: 0, FAILED: 0 };
  let avgJobDurationMs = null;
  jobStats.forEach(({ _id, count, avgDurationMs }) => {
    jobCounts[_id] = count;
    if (_id === "COMPLETED" && avgDurationMs != null) {
      avgJobDurationMs = Math.round(avgDurationMs);
    }
  });
  const totalRuns = Object.values(jobCounts).reduce((a, b) => a + b, 0);

  // Reshape request stats
  const requestCounts = { COMPLETED: 0, FAILED: 0, SKIPPED: 0 };
  requestStats.forEach(({ _id, count }) => { requestCounts[_id] = count; });

  const successRate = totalRuns > 0
    ? Math.round((jobCounts.COMPLETED / totalRuns) * 100)
    : null;

  // Shape per-request latency stats
  const perRequestLatency = latencyByRequest.map(({ _id, avgLatencyMs, minLatencyMs, maxLatencyMs, totalRuns: runs }) => ({
    requestIndex: _id.index,
    requestName: _id.name,
    avgLatencyMs: Math.round(avgLatencyMs),
    minLatencyMs,
    maxLatencyMs,
    totalRuns: runs,
  }));

  res.status(200).json({
    success: true,
    data: {
      collection: {
        id: collection._id,
        name: collection.name,
        executionMode: collection.executionMode,
      },
      runs: {
        total: totalRuns,
        byStatus: jobCounts,
        successRate: successRate !== null ? `${successRate}%` : "N/A",
        avgJobDurationMs,
      },
      requests: {
        byStatus: requestCounts,
        perRequest: perRequestLatency,
      },
      last10Runs: last10Jobs,
    },
  });
};

module.exports = { getGlobalMetrics, getCollectionMetrics };