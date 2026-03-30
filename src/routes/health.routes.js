// src/routes/health.routes.js
const express = require("express");
const { getHealth } = require("../controllers/health.controller");
const router = express.Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the server and database connection
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Server is healthy and database is connected
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 status:
 *                   type: string
 *                   example: ok
 *                 db:
 *                   type: string
 *                   enum: [connected, disconnected]
 *                   example: connected
 *                 uptime:
 *                   type: number
 *                   example: 1234.567
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Database is disconnected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", getHealth);

module.exports = router;