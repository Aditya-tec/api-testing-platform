// src/controllers/job.controller.js

const Job = require("../models/Job.model");
const RequestResult = require("../models/RequestResult.model");
const Log = require("../models/Log.model");
const Collection = require("../models/Collection.model");
const AuthProfile = require("../models/AuthProfile.model");
const { LOG_EVENTS } = require("../models/Log.model");
const { enqueueJob } = require("../jobs/queue");

// ─── Helper ───────────────────────────────────────────────────────────────────
// Removes the decrypted token from authSnapshot before sending to client.
// The token must live in the DB snapshot so the worker can use it,
// but it must never be returned in an API response.
const safeJob = (job) => {
  const obj = job.toJSON ? job.toJSON() : { ...job };
  if (obj.authSnapshot && obj.authSnapshot.token) {
    obj.authSnapshot = { ...obj.authSnapshot, token: "[REDACTED]" };
  }
  return obj;
};

// ─── POST /jobs ───────────────────────────────────────────────────────────────
const createJob = async (req, res) => {
  const { collectionId } = req.body;

  if (!collectionId) {
    return res.status(400).json({ success: false, error: "collectionId is required" });
  }

  const collection = await Collection.findById(collectionId);
  if (!collection) {
    return res.status(404).json({ success: false, error: "Collection not found" });
  }

  // Resolve auth — authProfile takes precedence over inline auth
  let authSnapshot = collection.auth?.toObject?.() ?? collection.auth ?? { type: "none" };
  if (collection.authProfileId) {
    const profile = await AuthProfile.findById(collection.authProfileId);
    if (profile) {
      authSnapshot = {
        type: profile.type,
        token: profile.decryptedToken(), // decrypted at snapshot time; redacted in responses
        headerName: profile.headerName,
      };
    }
  }

  const job = await Job.create({
    collectionId: collection._id,
    executionMode: collection.executionMode,
    requestsSnapshot: collection.requests,
    authSnapshot,
    status: "PENDING",
    variables: {},
  });

  // Pre-create a PENDING RequestResult for every request so they're trackable immediately
  const requestResults = collection.requests.map((r) => ({
    jobId: job._id,
    requestIndex: r.index,
    requestName: r.name,
    status: "PENDING",
  }));
  await RequestResult.insertMany(requestResults);

  await Log.create({
    jobId: job._id,
    event: LOG_EVENTS.JOB_STARTED,
    meta: { collectionId, totalRequests: collection.requests.length },
  });

  await enqueueJob(job._id.toString());

  res.status(201).json({ success: true, data: safeJob(job) });
};

// ─── GET /jobs — list all jobs (paginated) ────────────────────────────────────
const listJobs = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  // Optional filters
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.collectionId) filter.collectionId = req.query.collectionId;

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .select("-requestsSnapshot -authSnapshot") // omit large/sensitive fields from list
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("collectionId", "name executionMode"),
    Job.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    page,
    pages: Math.ceil(total / limit),
    count: jobs.length,
    data: jobs,
  });
};

// ─── GET /jobs/:id ────────────────────────────────────────────────────────────
const getJob = async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: "Job not found" });
  }
  res.status(200).json({ success: true, data: safeJob(job) });
};

// ─── POST /jobs/:id/rerun ─────────────────────────────────────────────────────
// Creates a new Job using the original job's snapshot — not the current collection.
// This is the payoff of the snapshot design: rerun is always deterministic.
const rerunJob = async (req, res) => {
  const original = await Job.findById(req.params.id);
  if (!original) {
    return res.status(404).json({ success: false, error: "Job not found" });
  }

  const newJob = await Job.create({
    collectionId: original.collectionId,
    executionMode: original.executionMode,
    requestsSnapshot: original.requestsSnapshot, // same snapshot as original
    authSnapshot: original.authSnapshot,          // same auth as original
    status: "PENDING",
    variables: {},
  });

  // Pre-create RequestResults for the new job
  const requestResults = original.requestsSnapshot.map((r) => ({
    jobId: newJob._id,
    requestIndex: r.index,
    requestName: r.name,
    status: "PENDING",
  }));
  await RequestResult.insertMany(requestResults);

  await Log.create({
    jobId: newJob._id,
    event: LOG_EVENTS.JOB_STARTED,
    meta: {
      rerunOf: original._id,
      totalRequests: original.requestsSnapshot.length,
    },
  });

  await enqueueJob(newJob._id.toString());

  res.status(201).json({
    success: true,
    message: "Rerun job created",
    data: safeJob(newJob),
  });
};

// ─── GET /jobs/:id/results ────────────────────────────────────────────────────
const getJobResults = async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: "Job not found" });
  }
  const results = await RequestResult.find({ jobId: req.params.id }).sort({ requestIndex: 1 });
  res.status(200).json({
    success: true,
    jobStatus: job.status,
    count: results.length,
    data: results,
  });
};

// ─── GET /jobs/:id/logs ───────────────────────────────────────────────────────
const getJobLogs = async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ success: false, error: "Job not found" });
  }
  const logs = await Log.find({ jobId: req.params.id }).sort({ timestamp: 1 });
  res.status(200).json({ success: true, count: logs.length, data: logs });
};

// ─── GET /collections/:collectionId/jobs ──────────────────────────────────────
const getJobsByCollection = async (req, res) => {
  const jobs = await Job.find({ collectionId: req.params.collectionId })
    .select("-requestsSnapshot -authSnapshot")
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: jobs.length, data: jobs });
};

module.exports = {
  createJob,
  listJobs,
  getJob,
  rerunJob,
  getJobResults,
  getJobLogs,
  getJobsByCollection,
};