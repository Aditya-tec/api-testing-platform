// src/middlewares/errorHandler.js
// Central error handling middleware.
// All errors thrown anywhere in the app flow here via express-async-errors.
// Always returns a consistent JSON shape — no raw stack traces to the client.

const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  // Log the full error internally
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: "Validation failed",
      details: messages,
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: "Duplicate entry",
      details: err.keyValue,
    });
  }

  // Mongoose bad ObjectId (e.g. GET /jobs/not-a-valid-id)
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      error: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // Default: internal server error
  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    error: err.message || "Internal server error",
  });
};

module.exports = errorHandler;