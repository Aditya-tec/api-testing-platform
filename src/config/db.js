// src/config/db.js
// Handles MongoDB connection using Mongoose.
// Called once at server startup. Logs connection status clearly.

const mongoose = require("mongoose");
const env = require("./env");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    console.log(`[db] MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[db] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

// Graceful disconnect — called on process shutdown
const disconnectDB = async () => {
  await mongoose.connection.close();
  console.log("[db] MongoDB disconnected");
};

module.exports = { connectDB, disconnectDB };