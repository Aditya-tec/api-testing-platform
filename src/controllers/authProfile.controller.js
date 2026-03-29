// src/controllers/authProfile.controller.js
// CRUD for saved auth profiles.
//
// IMPORTANT: The token is NEVER returned in any response.
// Clients can create, list, update, and delete profiles — but never read the token back.
// This matches how credential managers (GitHub Secrets, AWS Secrets Manager) work.

const AuthProfile = require("../models/AuthProfile.model");

// POST /auth-profiles
const createAuthProfile = async (req, res) => {
  const { name, type, token, headerName, description } = req.body;

  if (!name || !type || !token) {
    return res.status(400).json({
      success: false,
      error: "name, type, and token are required",
    });
  }

  if (!["bearer", "apiKey"].includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'type must be "bearer" or "apiKey"',
    });
  }

  if (type === "apiKey" && !headerName) {
    return res.status(400).json({
      success: false,
      error: "headerName is required for apiKey auth type",
    });
  }

  const profile = await AuthProfile.create({ name, type, token, headerName, description });

  // Return safe object — no token in response
  res.status(201).json({ success: true, data: profile.toSafeObject() });
};

// GET /auth-profiles
const getAuthProfiles = async (req, res) => {
  const profiles = await AuthProfile.find().sort({ createdAt: -1 });
  res.status(200).json({
    success: true,
    count: profiles.length,
    data: profiles.map((p) => p.toSafeObject()),
  });
};

// GET /auth-profiles/:id
const getAuthProfile = async (req, res) => {
  const profile = await AuthProfile.findById(req.params.id);
  if (!profile) {
    return res.status(404).json({ success: false, error: "Auth profile not found" });
  }
  res.status(200).json({ success: true, data: profile.toSafeObject() });
};

// PUT /auth-profiles/:id
// Allows updating name, description, headerName — and rotating the token
const updateAuthProfile = async (req, res) => {
  const { name, token, headerName, description } = req.body;
  const update = {};

  if (name) update.name = name;
  if (description !== undefined) update.description = description;
  if (headerName) update.headerName = headerName;
  if (token) update.token = token; // setter will re-encrypt automatically

  const profile = await AuthProfile.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });

  if (!profile) {
    return res.status(404).json({ success: false, error: "Auth profile not found" });
  }

  res.status(200).json({ success: true, data: profile.toSafeObject() });
};

// DELETE /auth-profiles/:id
const deleteAuthProfile = async (req, res) => {
  const profile = await AuthProfile.findByIdAndDelete(req.params.id);
  if (!profile) {
    return res.status(404).json({ success: false, error: "Auth profile not found" });
  }
  res.status(200).json({ success: true, message: "Auth profile deleted" });
};

module.exports = {
  createAuthProfile,
  getAuthProfiles,
  getAuthProfile,
  updateAuthProfile,
  deleteAuthProfile,
};