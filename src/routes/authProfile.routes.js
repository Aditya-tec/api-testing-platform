// src/routes/authProfile.routes.js
const express = require("express");
const {
  createAuthProfile,
  getAuthProfiles,
  getAuthProfile,
  updateAuthProfile,
  deleteAuthProfile,
} = require("../controllers/authProfile.controller");

const router = express.Router();

/**
 * @swagger
 * /auth-profiles:
 *   get:
 *     summary: List all auth profiles
 *     description: Retrieve all saved authentication profiles. Token values are never returned in responses.
 *     tags:
 *       - Auth Profiles
 *     responses:
 *       200:
 *         description: List of auth profiles
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
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuthProfile'
 *   post:
 *     summary: Create a new auth profile
 *     description: Create a reusable authentication credential that can be linked to multiple collections
 *     tags:
 *       - Auth Profiles
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, token]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Prod Bearer Token
 *               type:
 *                 type: string
 *                 enum: [bearer, apiKey]
 *                 example: bearer
 *               token:
 *                 type: string
 *                 example: sk-abc123def456
 *               headerName:
 *                 type: string
 *                 nullable: true
 *                 example: X-API-Key
 *               description:
 *                 type: string
 *                 example: Production API token for external services
 *     responses:
 *       201:
 *         description: Auth profile created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AuthProfile'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/").get(getAuthProfiles).post(createAuthProfile);

/**
 * @swagger
 * /auth-profiles/{id}:
 *   get:
 *     summary: Get an auth profile by ID
 *     description: Retrieve a specific auth profile details. Token value is never returned.
 *     tags:
 *       - Auth Profiles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439016
 *     responses:
 *       200:
 *         description: Auth profile details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AuthProfile'
 *       404:
 *         description: Auth profile not found
 *   put:
 *     summary: Update an auth profile
 *     description: Update auth profile details or rotate the token
 *     tags:
 *       - Auth Profiles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439016
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               token:
 *                 type: string
 *               headerName:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Auth profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/AuthProfile'
 *       404:
 *         description: Auth profile not found
 *   delete:
 *     summary: Delete an auth profile
 *     description: Delete an auth profile. Collections linked to this profile will need to be updated.
 *     tags:
 *       - Auth Profiles
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439016
 *     responses:
 *       200:
 *         description: Auth profile deleted
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
 *                   example: Auth profile deleted
 *       404:
 *         description: Auth profile not found
 */
router.route("/:id").get(getAuthProfile).put(updateAuthProfile).delete(deleteAuthProfile);

module.exports = router;