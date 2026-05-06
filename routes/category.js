const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const { protect, adminOnly } = require("../middleware/auth");
const { handleSubcategoryUploadErrors } = require("../middleware/uploadMiddleware");
const {
  uploadToCloudinary,
  deleteCloudinaryImages,
} = require("../utils/cloudinaryProcessor");

// GET /api/categories — public
router.get("/", async (req, res) => {
  try {
    const filter = req.query.includeInactive === "true" ? {} : { isActive: true };
    const categories = await Category.find(filter).sort({ order: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/categories/:id — public
router.get("/:id", async (req, res) => {
  try {
    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/categories — admin only
router.post("/", protect, adminOnly, handleSubcategoryUploadErrors, async (req, res) => {
  try {
    const { name, slug, emoji, description, nameAr, descriptionAr, icon, image } = req.body;
    const exists = await Category.findOne({ slug });
    if (exists) return res.status(400).json({ message: "Category already exists" });

    // Upload image file if provided; otherwise fall back to URL from body
    let imageUrl = image || "";
    if (req.file) {
      const result = await uploadToCloudinary(req.file.buffer, { folder: "categories" });
      imageUrl = result.secure_url;
    }

    const cat = await Category.create({
      name,
      slug,
      emoji: emoji || icon || "",
      icon: icon || emoji || "",
      description: description || "",
      nameAr: nameAr || "",
      descriptionAr: descriptionAr || "",
      image: imageUrl,
    });
    res.status(201).json(cat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/categories/:id — admin only
router.put("/:id", protect, adminOnly, handleSubcategoryUploadErrors, async (req, res) => {
  try {
    const updates = { ...req.body };

    if (updates.emoji && !updates.icon) {
      updates.icon = updates.emoji;
    }
    if (updates.icon && !updates.emoji) {
      updates.emoji = updates.icon;
    }
    if (updates.is_active !== undefined) {
      updates.isActive = updates.is_active;
      delete updates.is_active;
    }

    // Upload new image if provided; delete the old one from Cloudinary (best-effort)
    if (req.file) {
      const existing = await Category.findById(req.params.id);
      if (existing?.image) {
        deleteCloudinaryImages([existing.image]).catch(console.error);
      }
      const result = await uploadToCloudinary(req.file.buffer, { folder: "categories" });
      updates.image = result.secure_url;
    }

    const cat = await Category.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/categories/:id — admin only
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const cat = await Category.findByIdAndDelete(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
