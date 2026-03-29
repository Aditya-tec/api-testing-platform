// src/middlewares/rateLimiter.js
// Rate limiting to prevent abuse of the job creation and collection endpoints.
//
// Two limiters:
//   1. jobCreationLimiter  — tight limit on POST /jobs (most expensive operation)
//   2. apiLimiter          — general limit applied to all /api/v1 routes
//
// Uses express-rate-limit with in-memory store (fine for single-instance).
// In production with multiple instances, swap store for RedisStore.

const rateLimit = require("express-rate-limit");

// ── General API limiter ───────────────────────────────────────────────────────
// 100 requests per minute per IP across all routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 100,
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please wait before trying again.",
  },
  skip: (req) => req.path === "/health", // never rate-limit health checks
});

// ── Job creation limiter ──────────────────────────────────────────────────────
// 20 job creations per minute per IP
// Tight because each job triggers actual HTTP requests to external services
const jobCreationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Job creation rate limit exceeded. Max 20 jobs per minute per IP.",
  },
});

module.exports = { apiLimiter, jobCreationLimiter };