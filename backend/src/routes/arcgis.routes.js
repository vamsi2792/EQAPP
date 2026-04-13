const express = require("express");
const router = express.Router();

// ✅ Middleware
const verifyJWT = require("../middleware/auth.middleware");

// ✅ Controller
const { generateToken } = require("../controllers/arcgis.controller");

/**
 * @route   GET /api/arcgis-token
 * @desc    Generate ArcGIS token securely
 * @access  Protected
 */
router.get("/arcgis-token", verifyJWT, generateToken);

module.exports = router;