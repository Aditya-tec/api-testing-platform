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

/**
 * @swagger
 * /jobs:
 *   get:
 *     summary: List all jobs
 *     description: Retrieve a paginated list of job executions with optional filtering
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, RUNNING, COMPLETED, PARTIAL, FAILED]
 *       - in: query
 *         name: collectionId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                   example: 100
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 pages:
 *                   type: integer
 *                   example: 5
 *                 count:
 *                   type: integer
 *                   example: 20
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 *   post:
 *     summary: Create and execute a job
 *     description: Create a new job from a collection and enqueue it for execution
 *     tags:
 *       - Jobs
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [collectionId]
 *             properties:
 *               collectionId:
 *                 type: string
 *                 example: 507f1f77bcf86cd799439011
 *     responses:
 *       201:
 *         description: Job created and queued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       400:
 *         description: Validation failed or collection not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Job creation rate limit exceeded
 */
router.get("/", listJobs);
router.post("/", jobCreationLimiter, validateJob, createJob);

/**
 * @swagger
 * /jobs/{id}:
 *   get:
 *     summary: Get a job by ID
 *     description: Retrieve details of a specific job execution
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439013
 *     responses:
 *       200:
 *         description: Job details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 */
router.get("/:id", getJob);

/**
 * @swagger
 * /jobs/{id}/rerun:
 *   post:
 *     summary: Rerun a previous job
 *     description: Create a new job using the same request snapshot and auth as a previous execution
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439013
 *     responses:
 *       201:
 *         description: Job rerun queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Rerun job created
 *                 data:
 *                   $ref: '#/components/schemas/Job'
 *       404:
 *         description: Job not found
 */
router.post("/:id/rerun", rerunJob);

/**
 * @swagger
 * /jobs/{id}/results:
 *   get:
 *     summary: Get results for a job
 *     description: Retrieve the execution results of each request in a job
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439013
 *     responses:
 *       200:
 *         description: Request results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 jobStatus:
 *                   type: string
 *                   enum: [PENDING, RUNNING, COMPLETED, PARTIAL, FAILED]
 *                 count:
 *                   type: integer
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/RequestResult'
 *       404:
 *         description: Job not found
 */
router.get("/:id/results", getJobResults);

/**
 * @swagger
 * /jobs/{id}/logs:
 *   get:
 *     summary: Get event logs for a job
 *     description: Retrieve the detailed event trail for a job execution
 *     tags:
 *       - Jobs
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439013
 *     responses:
 *       200:
 *         description: Job event logs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 25
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Log'
 *       404:
 *         description: Job not found
 */
router.get("/:id/logs", getJobLogs);

module.exports = router;