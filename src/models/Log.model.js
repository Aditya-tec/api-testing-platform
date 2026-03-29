// src/models/Log.model.js
// Granular event trail for a job.
// Captures lifecycle transitions, variable extractions, retries, errors.
// requestResultId is null for job-level events (e.g. JOB_STARTED).

const mongoose = require("mongoose");

// All possible log event types — defined as constants so nothing is a magic string
const LOG_EVENTS = {
  JOB_STARTED: "JOB_STARTED",
  JOB_COMPLETED: "JOB_COMPLETED",
  JOB_FAILED: "JOB_FAILED",
  JOB_PARTIAL: "JOB_PARTIAL",

  REQUEST_STARTED: "REQUEST_STARTED",
  REQUEST_COMPLETED: "REQUEST_COMPLETED",
  REQUEST_FAILED: "REQUEST_FAILED",
  REQUEST_SKIPPED: "REQUEST_SKIPPED",
  REQUEST_RETRYING: "REQUEST_RETRYING",

  VAR_EXTRACTED: "VAR_EXTRACTED",   // { variable, value, fromRequestIndex }
  VAR_INJECTED: "VAR_INJECTED",     // { variable, into: "url" | "body" | "header" }
};

const LogSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },

    requestResultId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RequestResult",
      default: null,
    },

    event: {
      type: String,
      enum: Object.values(LOG_EVENTS),
      required: true,
    },

    // Flexible metadata — varies per event type
    // Examples:
    //   VAR_EXTRACTED: { variable: "userId", value: 123, fromRequestIndex: 0 }
    //   REQUEST_RETRYING: { attempt: 2, reason: "timeout" }
    //   REQUEST_FAILED: { httpStatus: 500, errorMessage: "Internal Server Error" }
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // No updatedAt needed — logs are append-only
    timestamps: { createdAt: "timestamp", updatedAt: false },
  }
);

module.exports = mongoose.model("Log", LogSchema);
module.exports.LOG_EVENTS = LOG_EVENTS;