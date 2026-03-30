# Swagger/OpenAPI Documentation Setup

## Overview
Swagger UI and OpenAPI (v3.0.0) documentation has been fully integrated into the API Testing Platform. All endpoints are documented with request/response examples, error codes, and schema definitions.

## What Was Added

### 1. **New Configuration File: `src/config/swagger.js`**
   - Defines OpenAPI 3.0.0 specification
   - Centralizes all schema definitions (Collection, Job, RequestResult, Log, AuthProfile, Error)
   - Configures Swagger servers (development + production)
   - References all route files for JSDoc parsing

### 2. **Updated: `src/app.js`**
   - Added import: `const swaggerUi = require("swagger-ui-express");`
   - Added import: `const swaggerSpec = require("./config/swagger");`
   - Added route middleware:
     ```javascript
     app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
     ```
   - **Swagger UI accessible at:** `http://localhost:5000/api-docs`
   - **OpenAPI JSON spec at:** `http://localhost:5000/api-docs/swagger.json`

### 3. **Updated All Route Files with JSDoc Comments**

#### `src/routes/health.routes.js`
- Documented: `GET /health`

#### `src/routes/collection.routes.js`
- Documented: `GET /collections` (list all)
- Documented: `POST /collections` (create)
- Documented: `GET /collections/{id}` (get one)
- Documented: `PUT /collections/{id}` (update)
- Documented: `DELETE /collections/{id}` (delete)
- Documented: `GET /collections/{collectionId}/jobs` (get collection job history)

#### `src/routes/job.routes.js`
- Documented: `GET /jobs` (list with pagination + filtering)
- Documented: `POST /jobs` (create and execute)
- Documented: `GET /jobs/{id}` (get job details)
- Documented: `POST /jobs/{id}/rerun` (rerun from snapshot)
- Documented: `GET /jobs/{id}/results` (get request results)
- Documented: `GET /jobs/{id}/logs` (get event logs)

#### `src/routes/metrics.routes.js`
- Documented: `GET /metrics` (global system metrics)
- Documented: `GET /metrics/collections/{id}` (per-collection metrics)

#### `src/routes/authProfile.routes.js`
- Documented: `GET /auth-profiles` (list all)
- Documented: `POST /auth-profiles` (create profile)
- Documented: `GET /auth-profiles/{id}` (get one)
- Documented: `PUT /auth-profiles/{id}` (update + token rotation)
- Documented: `DELETE /auth-profiles/{id}` (delete profile)

## Schema Definitions

All schemas are reusable components defined in `src/config/swagger.js`:

- **Collection** - API test collection definition
- **Job** - Single execution instance of a collection
- **RequestResult** - Outcome of one HTTP request within a job
- **Log** - Event trail entry (lifecycle + variable extraction)
- **AuthProfile** - Reusable credential storage
- **Error** - Standard error response shape

## Features Included

✅ **Request/Response Examples** - Every endpoint has sample data
✅ **Parameter Descriptions** - Path, query, and body parameters documented
✅ **Error Codes** - 404, 400, 429, 503 errors documented with examples
✅ **Schema References** - Reusable component definitions
✅ **Tags** - Endpoints grouped by resource (Collections, Jobs, Metrics, etc.)
✅ **OpenAPI 3.0.0 Compliant** - Standard format
✅ **Swagger UI Interactive** - Try requests directly from browser

## How to Access

### Local Development
1. Start the server: `npm start` (listening on port 5000)
2. Open browser: `http://localhost:5000/api-docs`
3. Interact with any endpoint directly

### Production
- Update `src/config/swagger.js` server URLs for your deployment:
  ```javascript
  servers: [
    {
      url: "https://your-api.example.com/api/v1",
      description: "Production server",
    },
  ]
  ```

### Programmatic Access
- OpenAPI JSON: `GET http://localhost:5000/api-docs/swagger.json`
- Use with code generators (e.g., OpenAPI Generator, Swagger Codegen)

## Design Decisions

1. **JSDoc in Route Files** - Comments stay close to the actual routes for easy maintenance
2. **Centralized Schemas** - `swagger.js` defines reusable components to avoid duplication
3. **No Auth Required** - Swagger UI is public (add auth if needed for production)
4. **Rate Limit Exempt** - `/api-docs` route is not rate-limited (as per `rateLimiter.js`)

## Dependencies Used

Both packages were already in your `node_modules`:
- `swagger-ui-express@5.0.1` - Serves Swagger UI HTML
- `swagger-jsdoc@6.2.8` - Extracts JSDoc comments and generates OpenAPI spec

## Interview-Readiness Checklist

✅ Complete API documentation
✅ Interactive Swagger UI for testing
✅ Standard OpenAPI 3.0.0 format
✅ All endpoints documented with examples
✅ Error handling documented
✅ Security headers noted (CORS, helmet, rate limiting)
✅ Request validation documented
✅ Reusable auth profiles documented

## Example Swagger Comment Structure

```javascript
/**
 * @swagger
 * /endpoint-path:
 *   get:
 *     summary: Brief description
 *     description: Detailed description
 *     tags:
 *       - Resource Name
 *     parameters:
 *       - in: path|query|header
 *         name: paramName
 *         required: true
 *         schema:
 *           type: string
 *         example: some-value
 *     responses:
 *       200:
 *         description: Success response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SchemaName'
 *       400:
 *         description: Error response
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/endpoint-path", handler);
```

## Testing the Setup

1. Start server: `npm start`
2. Visit `http://localhost:5000/api-docs`
3. Try a simple endpoint (e.g., `GET /health`)
4. Verify response matches documented schema

---

**Swagger integration complete! Your API is now fully documented and interview-ready.**
