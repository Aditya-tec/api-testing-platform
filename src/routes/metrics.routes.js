// src/routes/metrics.routes.js
const express = require("express");
const { getGlobalMetrics, getCollectionMetrics } = require("../controllers/metrics.controller");

const router = express.Router();

/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Get global system metrics
 *     description: Retrieve system-wide statistics about job execution, request success rates, and latency
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Global metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobs:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 150
 *                         byStatus:
 *                           type: object
 *                           properties:
 *                             COMPLETED:
 *                               type: integer
 *                               example: 120
 *                             FAILED:
 *                               type: integer
 *                               example: 20
 *                             PARTIAL:
 *                               type: integer
 *                               example: 10
 *                             PENDING:
 *                               type: integer
 *                               example: 0
 *                             RUNNING:
 *                               type: integer
 *                               example: 0
 *                         successRate:
 *                           type: string
 *                           example: "80%"
 *                     requests:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 450
 *                         byStatus:
 *                           type: object
 *                           example:
 *                             COMPLETED: 400
 *                             FAILED: 40
 *                             SKIPPED: 10
 *                         avgLatencyMs:
 *                           type: integer
 *                           example: 250
 *                     recentFailures:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           status:
 *                             type: string
 *                           collectionId:
 *                             type: object
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 */
router.get("/", getGlobalMetrics);

/**
 * @swagger
 * /metrics/collections/{id}:
 *   get:
 *     summary: Get metrics for a specific collection
 *     description: Retrieve performance metrics for a collection across all its job executions
 *     tags:
 *       - Metrics
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Collection metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     collection:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         executionMode:
 *                           type: string
 *                     runs:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         byStatus:
 *                           type: object
 *                         successRate:
 *                           type: string
 *                         avgJobDurationMs:
 *                           type: integer
 *                     requests:
 *                       type: object
 *                       properties:
 *                         byStatus:
 *                           type: object
 *                         perRequest:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               requestIndex:
 *                                 type: integer
 *                               requestName:
 *                                 type: string
 *                               avgLatencyMs:
 *                                 type: integer
 *                               minLatencyMs:
 *                                 type: integer
 *                               maxLatencyMs:
 *                                 type: integer
 *                               totalRuns:
 *                                 type: integer
 *                     last10Runs:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Collection not found
 */
router.get("/collections/:id", getCollectionMetrics);

module.exports = router;