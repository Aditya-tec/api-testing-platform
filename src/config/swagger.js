// src/config/swagger.js
// Swagger/OpenAPI configuration for API documentation

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Testing Platform",
      version: "1.0.0",
      description: "A comprehensive API testing and monitoring platform with job queuing, request batching, variable extraction, and metrics aggregation.",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:5000/api/v1",
        description: "Development server",
      },
      {
        url: "https://api.example.com/api/v1",
        description: "Production server",
      },
    ],
    components: {
      schemas: {
        Collection: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439011" },
            name: { type: "string", example: "My API Collection" },
            description: { type: "string", example: "Tests for user endpoints" },
            executionMode: { type: "string", enum: ["sequential", "parallel"], example: "sequential" },
            auth: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["none", "bearer", "apiKey"], example: "bearer" },
                token: { type: "string", example: "secret-token-value" },
                headerName: { type: "string", example: "Authorization" },
              },
            },
            authProfileId: { type: "string", nullable: true, example: "507f1f77bcf86cd799439012" },
            requests: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  index: { type: "integer", example: 0 },
                  name: { type: "string", example: "Get Users" },
                  method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"], example: "GET" },
                  url: { type: "string", example: "https://api.example.com/users" },
                  headers: { type: "object", example: { "Content-Type": "application/json" } },
                  body: { type: "object", nullable: true, example: null },
                  extract: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        variable: { type: "string", example: "userId" },
                        from: { type: "string", example: "data.id" },
                      },
                    },
                  },
                  timeoutMs: { type: "integer", example: 10000 },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Job: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439013" },
            collectionId: { type: "string", example: "507f1f77bcf86cd799439011" },
            status: { type: "string", enum: ["PENDING", "RUNNING", "COMPLETED", "PARTIAL", "FAILED"], example: "COMPLETED" },
            executionMode: { type: "string", enum: ["sequential", "parallel"], example: "sequential" },
            requestsSnapshot: { type: "array" },
            authSnapshot: { type: "object" },
            variables: { type: "object", example: { userId: "123" } },
            startedAt: { type: "string", format: "date-time" },
            completedAt: { type: "string", format: "date-time" },
            durationMs: { type: "integer", example: 1250 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        RequestResult: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439014" },
            jobId: { type: "string", example: "507f1f77bcf86cd799439013" },
            requestIndex: { type: "integer", example: 0 },
            requestName: { type: "string", example: "Get Users" },
            status: { type: "string", enum: ["PENDING", "RUNNING", "COMPLETED", "FAILED", "SKIPPED"], example: "COMPLETED" },
            httpStatus: { type: "integer", example: 200 },
            latencyMs: { type: "integer", example: 125 },
            responseSnippet: { type: "string", example: '{"data": {"id": 123}}' },
            errorMessage: { type: "string", nullable: true },
            retryCount: { type: "integer", example: 0 },
            startedAt: { type: "string", format: "date-time" },
            completedAt: { type: "string", format: "date-time" },
            durationMs: { type: "integer", example: 125 },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Log: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439015" },
            jobId: { type: "string", example: "507f1f77bcf86cd799439013" },
            requestResultId: { type: "string", nullable: true, example: "507f1f77bcf86cd799439014" },
            event: {
              type: "string",
              enum: [
                "JOB_STARTED", "JOB_COMPLETED", "JOB_FAILED", "JOB_PARTIAL",
                "REQUEST_STARTED", "REQUEST_COMPLETED", "REQUEST_FAILED", "REQUEST_SKIPPED", "REQUEST_RETRYING",
                "VAR_EXTRACTED", "VAR_INJECTED",
              ],
              example: "REQUEST_COMPLETED",
            },
            meta: { type: "object", example: { httpStatus: 200, latencyMs: 125 } },
            timestamp: { type: "string", format: "date-time" },
          },
        },
        AuthProfile: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439016" },
            name: { type: "string", example: "Prod Bearer Token" },
            type: { type: "string", enum: ["bearer", "apiKey"], example: "bearer" },
            headerName: { type: "string", nullable: true, example: "Authorization" },
            description: { type: "string", example: "Production API token" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            error: { type: "string", example: "Collection not found" },
            details: { type: "array", items: { type: "string" }, nullable: true },
          },
        },
      },
    },
  },
  apis: [
    "./src/routes/health.routes.js",
    "./src/routes/collection.routes.js",
    "./src/routes/job.routes.js",
    "./src/routes/metrics.routes.js",
    "./src/routes/authProfile.routes.js",
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
