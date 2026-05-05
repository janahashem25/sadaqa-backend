const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { adminOnly } = require("../middleware/adminOnly");
const caseController = require("../controllers/caseController");

// ==================== PUBLIC ROUTES ====================
router.get("/", caseController.getAllCases);
router.get("/urgent/list", caseController.getUrgentCases);
router.get("/featured/list", caseController.getFeaturedCases);
router.get("/search/query", caseController.searchCases);
router.get("/category/:categoryId", caseController.getCasesByCategory);

// ==================== PROTECTED ROUTES (USER) ====================
router.post("/", protect, caseController.createCase);
router.get("/my/requests", protect, caseController.getMyCases);
router.put("/:id", protect, caseController.updateCase);
router.patch("/:id/donate", protect, caseController.donateToCase);

// ==================== ADMIN ONLY ROUTES ====================
router.get("/admin/all", protect, adminOnly, caseController.getAllCasesAdmin);
router.patch("/:id/toggle-status", protect, adminOnly, caseController.toggleCaseStatus);
router.patch("/:id/toggle-featured", protect, adminOnly, caseController.toggleFeatured);
router.patch("/:id/approve", protect, adminOnly, caseController.approveCase);
router.patch("/:id/reject", protect, adminOnly, caseController.rejectCase);

// ==================== DYNAMIC :id ROUTE (must be LAST) ====================
router.get("/:id", caseController.getCaseById);

module.exports = router;