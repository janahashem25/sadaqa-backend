const express = require("express");
const ItemDonation = require("../models/ItemDonation");
const { protect } = require("../middleware/auth");
const { handleSubcategoryUploadErrors } = require("../middleware/uploadMiddleware");
const { uploadToCloudinary } = require("../utils/cloudinaryProcessor");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const { category, city, search, limit = 50 } = req.query;
    const filter = { status: "available", isActive: true };

    if (category && category !== "all") filter.category = category;
    if (city && city !== "all") filter["location.city"] = city;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { itemType: { $regex: search, $options: "i" } },
      ];
    }

    const items = await ItemDonation.find(filter)
      .populate("donor_id", "full_name phone")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", protect, handleSubcategoryUploadErrors, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      itemType,
      condition,
      quantity,
      image,
      location,
      expiresAt,
      contactPhone,
    } = req.body;

    if (!title || !description || !category || !location?.city) {
      return res.status(400).json({ success: false, message: "Title, description, category, and city are required" });
    }

    // Upload image file if provided; otherwise fall back to URL from body
    let imageUrl = image || "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, { folder: "item-donations" });
      imageUrl = result.secure_url;
    }

    const item = await ItemDonation.create({
      donor_id: req.user._id,
      title,
      description,
      category,
      itemType: itemType || category,
      condition: condition || "good",
      quantity: Number(quantity) > 0 ? Number(quantity) : 1,
      image: imageUrl,
      location: {
        city: location.city,
        country: location.country || "Lebanon",
      },
      expiresAt: expiresAt || null,
      contactPhone: contactPhone || req.user.phone || "",
      status: req.user.role === "admin" ? "available" : "pending",
      isActive: true,
    });

    const populated = await ItemDonation.findById(item._id).populate("donor_id", "full_name phone");
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/my", protect, async (req, res) => {
  try {
    const items = await ItemDonation.find({ donor_id: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
