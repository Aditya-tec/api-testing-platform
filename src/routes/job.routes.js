// src/routes/job.routes.js
const express = require("express");
const {
  createJob,
  listJobs,
  getJob,
  rerunJob,
  getJobResults,
  getJobLogs,
} = require("../controllers/job.controller");
const { validateJob } = require("../middlewares/validateRequest");
const { jobCreationLimiter } = require("../middlewares/rateLimiter");

const router = express.Router();

router.get("/", listJobs);                              // GET  /jobs
router.post("/", jobCreationLimiter, validateJob, createJob); // POST /jobs
router.get("/:id", getJob);                             // GET  /jobs/:id
router.post("/:id/rerun", rerunJob);                    // POST /jobs/:id/rerun
router.get("/:id/results", getJobResults);              // GET  /jobs/:id/results
router.get("/:id/logs", getJobLogs);                    // GET  /jobs/:id/logs

module.exports = router;