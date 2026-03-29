// src/controllers/health.controller.js
// Simple liveness check. Used by deployment platforms (Render, Railway)
// to confirm the server is up and the DB connection is alive.

const mongoose = require("mongoose");

const getHealth = (req, res) => {
  const dbState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbStatus = dbState === 1 ? "connected" : "disconnected";

  res.status(dbState === 1 ? 200 : 503).json({
    success: true,
    status: "ok",
    db: dbStatus,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

module.exports = { getHealth };