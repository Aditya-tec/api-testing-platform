// src/routes/index.js
// Root router — mounts all sub-routers under /api/v1
// Adding a new resource = one new line here.

const express = require("express");
const router = express.Router();

const healthRoutes = require("./health.routes");
const collectionRoutes = require("./collection.routes");
const jobRoutes = require("./job.routes");
const metricsRoutes = require("./metrics.routes");
const authProfileRoutes = require("./authProfile.routes");

router.use("/health", healthRoutes);
router.use("/collections", collectionRoutes);
router.use("/jobs", jobRoutes);
router.use("/metrics", metricsRoutes);
router.use("/auth-profiles", authProfileRoutes);

module.exports = router;