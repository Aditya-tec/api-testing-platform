// src/app.js
// Express app configuration.
// Separated from server.js so this can be imported in tests without binding to a port.

require("express-async-errors"); // patches Express to catch async errors automatically
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const routes = require("./routes");
const errorHandler = require("./middlewares/errorHandler");
const notFound = require("./middlewares/notFound");
const { apiLimiter } = require("./middlewares/rateLimiter");
const env = require("./config/env");
const swaggerSpec = require("./config/swagger");

const app = express();

// ─── Security headers ────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ────────────────────────────────────────────────────────────────────
// In dev: allow all origins. In production, lock this down to your frontend URL.
app.use(cors({
  origin: env.NODE_ENV === "development" ? "*" : env.FRONTEND_URL,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10kb" })); // Reject large payloads early
app.use(express.urlencoded({ extended: true }));

// ─── Request logging ──────────────────────────────────────────────────────────
// "dev" format in development, "combined" (Apache-style) in production
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

// ─── Swagger API documentation ────────────────────────────────────────────────
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── API routes ───────────────────────────────────────────────────────────────
app.use("/api/v1", apiLimiter, routes);

// ─── 404 handler (must be after routes) ──────────────────────────────────────
app.use(notFound);

// ─── Global error handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;