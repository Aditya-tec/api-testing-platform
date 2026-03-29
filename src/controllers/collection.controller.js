// src/controllers/collection.controller.js
// CRUD operations for Collections.
// Validation is intentionally minimal here — full input validation comes in Phase 4.

const Collection = require("../models/Collection.model");

// POST /collections
const createCollection = async (req, res) => {
  const { name, description, executionMode, auth, requests, authProfileId } = req.body;

  const collection = await Collection.create({
    name,
    description,
    executionMode,
    auth,
    requests,
    authProfileId: authProfileId || null,
  });

  res.status(201).json({
    success: true,
    data: collection,
  });
};

// GET /collections
const getCollections = async (req, res) => {
  const collections = await Collection.find().select("-requests").sort({ createdAt: -1 });
  // Exclude full requests array from list view for performance.
  // The client fetches full detail via GET /collections/:id.

  res.status(200).json({
    success: true,
    count: collections.length,
    data: collections,
  });
};

// GET /collections/:id
const getCollection = async (req, res) => {
  const collection = await Collection.findById(req.params.id);

  if (!collection) {
    return res.status(404).json({ success: false, error: "Collection not found" });
  }

  res.status(200).json({ success: true, data: collection });
};

// PUT /collections/:id
const updateCollection = async (req, res) => {
  const collection = await Collection.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!collection) {
    return res.status(404).json({ success: false, error: "Collection not found" });
  }

  res.status(200).json({ success: true, data: collection });
};

// DELETE /collections/:id
const deleteCollection = async (req, res) => {
  const collection = await Collection.findByIdAndDelete(req.params.id);

  if (!collection) {
    return res.status(404).json({ success: false, error: "Collection not found" });
  }

  res.status(200).json({ success: true, message: "Collection deleted" });
};

module.exports = {
  createCollection,
  getCollections,
  getCollection,
  updateCollection,
  deleteCollection,
};