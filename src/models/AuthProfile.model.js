// src/models/AuthProfile.model.js
// A saved, reusable auth credential that can be linked to collections.
//
// Design decision: auth lives here, NOT hardcoded per collection.
// This way one token change updates all collections using that profile.
//
// The token field is stored ENCRYPTED. It is decrypted only at execution time
// inside the worker — never sent back to the client in plaintext.

const mongoose = require("mongoose");
const { encrypt, decrypt } = require("../utils/encryption");

const AuthProfileSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g. "Prod Bearer Token"

    type: {
      type: String,
      enum: ["bearer", "apiKey"],
      required: true,
    },

    // Stored encrypted — never returned to client as plaintext
    // For bearer: the token value
    // For apiKey: the key value
    token: {
      type: String,
      required: true,
      set: (val) => encrypt(val),   // auto-encrypt on save
    },

    // For apiKey type: which header to inject into (e.g. "x-api-key", "Authorization")
    headerName: {
      type: String,
      default: null,
    },

    description: { type: String, default: "" },
  },
  { timestamps: true }
);

// When reading the profile for execution, decrypt the token.
// This is called explicitly — never happens automatically on toJSON.
AuthProfileSchema.methods.decryptedToken = function () {
  return decrypt(this.token);
};

// Never return the raw (encrypted) token in API responses
// The client sees the profile metadata but never the credential itself
AuthProfileSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    type: this.type,
    headerName: this.headerName,
    description: this.description,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model("AuthProfile", AuthProfileSchema);