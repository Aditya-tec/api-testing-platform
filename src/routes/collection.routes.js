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

/**
 * @swagger
 * /collections:
 *   get:
 *     summary: List all collections
 *     description: Retrieve a paginated list of all API test collections
 *     tags:
 *       - Collections
 *     responses:
 *       200:
 *         description: List of collections
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
 *                   example: 5
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Collection'
 *   post:
 *     summary: Create a new collection
 *     description: Create a new API test collection with requests and optional auth
 *     tags:
 *       - Collections
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, requests]
 *             properties:
 *               name:
 *                 type: string
 *                 example: My API Tests
 *               description:
 *                 type: string
 *                 example: Test suite for user endpoints
 *               executionMode:
 *                 type: string
 *                 enum: [sequential, parallel]
 *                 example: sequential
 *               authProfileId:
 *                 type: string
 *                 nullable: true
 *                 example: 507f1f77bcf86cd799439016
 *               auth:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [none, bearer, apiKey]
 *                   token:
 *                     type: string
 *                   headerName:
 *                     type: string
 *               requests:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   properties:
 *                     index:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     method:
 *                       type: string
 *                       enum: [GET, POST, PUT, PATCH, DELETE]
 *                     url:
 *                       type: string
 *                     headers:
 *                       type: object
 *                     body:
 *                       type: object
 *                       nullable: true
 *                     extract:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           variable:
 *                             type: string
 *                           from:
 *                             type: string
 *                     timeoutMs:
 *                       type: integer
 *     responses:
 *       201:
 *         description: Collection created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Collection'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.route("/").get(getCollections).post(validateCollection, createCollection);

/**
 * @swagger
 * /collections/{id}:
 *   get:
 *     summary: Get a collection by ID
 *     description: Retrieve a single collection with all its request definitions
 *     tags:
 *       - Collections
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Collection details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Collection'
 *       404:
 *         description: Collection not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   put:
 *     summary: Update a collection
 *     description: Update collection details, requests, or auth settings
 *     tags:
 *       - Collections
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               executionMode:
 *                 type: string
 *                 enum: [sequential, parallel]
 *               requests:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Collection updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Collection'
 *       404:
 *         description: Collection not found
 *   delete:
 *     summary: Delete a collection
 *     description: Delete a collection and all its associated jobs
 *     tags:
 *       - Collections
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: Collection deleted
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
 *                   example: Collection deleted
 *       404:
 *         description: Collection not found
 */
router.route("/:id").get(getCollection).put(validateCollection, updateCollection).delete(deleteCollection);

/**
 * @swagger
 * /collections/{collectionId}/jobs:
 *   get:
 *     summary: Get all jobs for a collection
 *     description: Retrieve the execution history for a specific collection
 *     tags:
 *       - Collections
 *     parameters:
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema:
 *           type: string
 *         example: 507f1f77bcf86cd799439011
 *     responses:
 *       200:
 *         description: List of jobs for this collection
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
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Job'
 */
router.get("/:collectionId/jobs", getJobsByCollection);

module.exports = router;