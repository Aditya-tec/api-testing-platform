// src/middlewares/notFound.js
// Catches any request that didn't match a registered route.
// Must be registered AFTER all routes in app.js.

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

module.exports = notFound;