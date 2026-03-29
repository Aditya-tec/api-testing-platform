// src/routes/metrics.routes.js
const express = require("express");
const { getGlobalMetrics, getCollectionMetrics } = require("../controllers/metrics.controller");

const router = express.Router();

router.get("/", getGlobalMetrics);
router.get("/collections/:id", getCollectionMetrics);

module.exports = router;