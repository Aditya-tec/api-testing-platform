// src/models/RequestResult.model.js
// One document per request within a job execution.
// This is how you answer: "which request in the batch failed, and why?"

const mongoose = require("mongoose");

const REQUEST_RESULT_STATUSES = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "SKIPPED"];

const RequestResultSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,  // queried heavily — always fetch by jobId
    },

    requestIndex: { type: Number, required: true },  // position in snapshot
    requestName: { type: String, default: "Untitled Request" },

    status: {
      type: String,
      enum: REQUEST_RESULT_STATUSES,
      default: "PENDING",
    },

    // HTTP outcome (null if request never fired — e.g. SKIPPED or network error)
    httpStatus: { type: Number, default: null },
    latencyMs: { type: Number, default: null },

    // First 2KB of response body stored as string
    responseSnippet: { type: String, default: null },

    // Error message if the request itself failed (not a non-2xx response)
    errorMessage: { type: String, default: null },

    // How many times this request was retried (0 = no retries, first attempt succeeded)
    retryCount: { type: Number, default: 0 },

    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Virtual: derived duration
RequestResultSchema.virtual("durationMs").get(function () {
  if (this.startedAt && this.completedAt) {
    return this.completedAt - this.startedAt;
  }
  return null;
});

RequestResultSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("RequestResult", RequestResultSchema);
module.exports.REQUEST_RESULT_STATUSES = REQUEST_RESULT_STATUSES;