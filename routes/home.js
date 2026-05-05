const express = require("express");
const router = express.Router();
const {
  getHomeData,
  getCategories,
  getCasesByCategory,
  getRelatedCases,
} = require("../controllers/homeController");

// Public routes
router.get("/", getHomeData);


module.exports = router;