// src/models/Collection.model.js
// Represents a saved collection of API requests.
// This is the DEFINITION — it never gets mutated by job runs.
// Auth tokens are stored as-is for now; encryption comes in Phase 6.

const mongoose = require("mongoose");

// Each request inside a collection
const RequestDefinitionSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },       // execution order
    name: { type: String, default: "Untitled Request" },
    method: {
      type: String,
      required: true,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      uppercase: true,
    },
    url: { type: String, required: true },          // may contain {{variables}}
    headers: { type: Map, of: String, default: {} },
    body: { type: mongoose.Schema.Types.Mixed },    // raw JSON body

    // Variable extraction rules
    // e.g. [{ variable: "userId", from: "data.id" }]
    // "from" is a dot-path into the parsed JSON response body
    extract: [
      {
        variable: { type: String, required: true },
        from: { type: String, required: true },
      },
    ],

    timeoutMs: { type: Number, default: 10000 },    // per-request timeout
  },
  { _id: false } // no separate _id per request definition; index is the key
);

const CollectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    executionMode: {
      type: String,
      enum: ["sequential", "parallel"],
      default: "sequential",
    },

    auth: {
      type: {
        type: String,
        enum: ["none", "bearer", "apiKey"],
        default: "none",
      },
      token: { type: String },         // used for bearer (stored encrypted)
      headerName: { type: String },    // used for apiKey (e.g. "x-api-key")
    },

    // Optional: link to a saved AuthProfile instead of inlining auth
    // If set, authProfile overrides the inline auth at job execution time
    authProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AuthProfile",
      default: null,
    },

    requests: {
      type: [RequestDefinitionSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "A collection must have at least one request.",
      },
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model("Collection", CollectionSchema);