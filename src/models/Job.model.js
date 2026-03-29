// src/models/Job.model.js
// Represents a single execution of a collection.
// Stores a SNAPSHOT of the requests at run time — not a reference.
// This makes re-runs deterministic even if the collection is edited later.

const mongoose = require("mongoose");

const JOB_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "PARTIAL", "FAILED"];

const JobSchema = new mongoose.Schema(
  {
    collectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Collection",
      required: true,
    },

    status: {
      type: String,
      enum: JOB_STATUSES,
      default: "PENDING",
    },

    executionMode: {
      type: String,
      enum: ["sequential", "parallel"],
      required: true,
    },

    // Deep copy of Collection.requests at the moment this job was created.
    // Worker reads from here, not from the Collection, to ensure consistency.
    requestsSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Auth snapshot — same idea: copy at run time so re-runs are consistent
    authSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // In-memory variable store for this job (populated during sequential execution)
    // Persisted here so you can audit what values were extracted and used
    variables: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },

    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Virtual: derived duration in ms
JobSchema.virtual("durationMs").get(function () {
  if (this.startedAt && this.completedAt) {
    return this.completedAt - this.startedAt;
  }
  return null;
});

JobSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Job", JobSchema);
module.exports.JOB_STATUSES = JOB_STATUSES;