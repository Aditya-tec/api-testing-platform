// src/routes/collection.routes.js
const express = require("express");
const {
  createCollection,
  getCollections,
  getCollection,
  updateCollection,
  deleteCollection,
} = require("../controllers/collection.controller");
const { getJobsByCollection } = require("../controllers/job.controller");
const { validateCollection } = require("../middlewares/validateRequest");

const router = express.Router();

router.route("/").get(getCollections).post(validateCollection, createCollection);
router.route("/:id").get(getCollection).put(validateCollection, updateCollection).delete(deleteCollection);
router.get("/:collectionId/jobs", getJobsByCollection);

module.exports = router;