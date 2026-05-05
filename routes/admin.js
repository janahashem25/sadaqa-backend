const express = require("express");
const router = express.Router();
const Case = require("../models/Case");
const User = require("../models/User");
const Donation = require("../models/Donation");
const ItemDonation = require("../models/ItemDonation");
const { protect, adminOnly } = require("../middleware/auth");

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// GET /api/admin/stats
router.get("/stats", async (req, res) => {
  try {
    const [totalCases, pendingCases, activeCases, completedCases, totalUsers, donations, pendingItems, availableItems] = await Promise.all([
      Case.countDocuments(),
      Case.countDocuments({ status: "pending" }),
      Case.countDocuments({ status: "active" }),
      Case.countDocuments({ status: "completed" }),
      User.countDocuments({ role: { $ne: "admin" } }),
      Donation.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]),
      ItemDonation.countDocuments({ status: "pending" }),
      ItemDonation.countDocuments({ status: "available", isActive: true }),
    ]);
    res.json({
      totalCases,
      pendingCases,
      activeCases,
      completedCases,
      totalUsers,
      totalRaised: donations[0]?.total || 0,
      pendingItems,
      availableItems,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/cases — all cases with all statuses
router.get("/cases", async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = {};
    if (status && status !== "all")   filter.status   = status;
    if (category && category !== "all") filter.category = category;
    if (search) filter.title = { $regex: search, $options: "i" };

    const cases = await Case.find(filter)
      .populate("category", "name slug emoji")
      .populate("user_id", "full_name email")
      .sort({ createdAt: -1 });
    res.json(cases);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/cases/:id/status — approve, reject, complete
router.put("/cases/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["pending", "active", "completed", "paused", "cancelled", "rejected", "archived"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid case status" });
    }

    const updates = {
      status,
      isActive: !["rejected", "archived", "cancelled"].includes(status),
      updatedAt: new Date(),
    };

    const c = await Case.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!c) return res.status(404).json({ message: "Case not found" });
    res.json(c);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/cases/:id/archive
router.put("/cases/:id/archive", async (req, res) => {
  try {
    const { reason } = req.body;
    const c = await Case.findByIdAndUpdate(
      req.params.id,
      { status: "archived", isActive: false, archived_reason: reason || "", archived_at: new Date(), updatedAt: new Date() },
      { new: true }
    );
    if (!c) return res.status(404).json({ message: "Case not found" });
    res.json(c);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/cases/:id/restore
router.put("/cases/:id/restore", async (req, res) => {
  try {
    const c = await Case.findByIdAndUpdate(
      req.params.id,
      { status: "active", isActive: true, archived_reason: "", archived_at: null, updatedAt: new Date() },
      { new: true }
    );
    if (!c) return res.status(404).json({ message: "Case not found" });
    res.json(c);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/admin/cases — add case directly
router.post("/cases", async (req, res) => {
  try {
    const c = await Case.create({
      ...req.body,
      titleAr: req.body.titleAr || req.body.title,
      descriptionAr: req.body.descriptionAr || req.body.description || "",
      status: req.body.status || "active",
      isActive: req.body.isActive ?? true,
      user_id: req.user._id,
    });
    res.status(201).json(c);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/admin/users
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: "admin" } })
      .select("-password_hash")
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/admin/users/:id/deactivate
router.put("/users/:id/deactivate", async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { is_active: false }, { new: true }).select("-password_hash");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/item-donations", async (req, res) => {
  try {
    const { status, category, search } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (category && category !== "all") filter.category = category;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { itemType: { $regex: search, $options: "i" } },
      ];
    }

    const items = await ItemDonation.find(filter)
      .populate("donor_id", "full_name email phone")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/item-donations/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ["pending", "available", "reserved", "donated", "rejected", "archived"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid item donation status" });
    }

    const item = await ItemDonation.findByIdAndUpdate(
      req.params.id,
      {
        status,
        isActive: !["rejected", "archived", "donated"].includes(status),
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("donor_id", "full_name email phone");

    if (!item) return res.status(404).json({ message: "Item donation not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
