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

router.route("/").get(getAuthProfiles).post(createAuthProfile);
router.route("/:id").get(getAuthProfile).put(updateAuthProfile).delete(deleteAuthProfile);

module.exports = router;