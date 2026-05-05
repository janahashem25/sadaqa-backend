const express = require("express");
const router = express.Router();
const Donation = require("../models/Donation");
const Case = require("../models/Case");
const { protect } = require("../middleware/auth");

// POST /api/donations — supporter only
router.post("/", protect, async (req, res) => {
  try {
    const { case_id, amount, payment_method, message, is_anonymous } = req.body;
    if (!case_id || !amount || !payment_method)
      return res.status(400).json({ message: "Missing required fields" });

    const c = await Case.findById(case_id);
    if (!c) return res.status(404).json({ message: "Case not found" });
    if (c.status !== "active" || !c.isActive)
      return res.status(400).json({ message: "Case is not accepting donations" });

    const normalizedAmount = Number(amount);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ message: "Donation amount must be greater than zero" });
    }

    const donation = await Donation.create({
      case_id,
      donor_id: req.user._id,
      amount: normalizedAmount,
      payment_method,
      message: message || "",
      is_anonymous: is_anonymous || false,
    });

    // Update raised amount and donors count
    await Case.findByIdAndUpdate(case_id, {
      $inc: { currentAmount: normalizedAmount },
      $set: { updatedAt: new Date() },
    });

    const updatedCase = await Case.findById(case_id)
      .populate("category", "name slug emoji")
      .populate("user_id", "full_name email");

    res.status(201).json({ success: true, data: donation, case: updatedCase });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/donations/my — supporter's donation history
router.get("/my", protect, async (req, res) => {
  try {
    const donations = await Donation.find({ donor_id: req.user._id })
      .populate("case_id", "title category city status goal_amount raised_amount")
      .sort({ createdAt: -1 });
    res.json(donations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/donations/case/:id — donations for a specific case
router.get("/case/:id", async (req, res) => {
  try {
    const donations = await Donation.find({ case_id: req.params.id, status: "completed" })
      .populate("donor_id", "full_name")
      .sort({ createdAt: -1 });

    // Hide donor name if anonymous
    const safe = donations.map((d) => ({
      ...d.toObject(),
      donor_id: d.is_anonymous ? { full_name: "Anonymous" } : d.donor_id,
    }));
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
