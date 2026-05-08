const Case = require("../models/Case");
const Category = require("../models/Category");
const {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteCloudinaryImages,
  findRemovedImages,
} = require("../utils/cloudinaryProcessor");

const getTruthyBoolean = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  const normalized = String(value || "").trim().toLowerCase();
  return ["true", "1", "yes", "on"].includes(normalized);
};

const getShowRequesterName = (body) => {
  if (body.showRequesterName !== undefined) {
    return getTruthyBoolean(body.showRequesterName);
  }

  if (body.showName !== undefined) {
    return getTruthyBoolean(body.showName);
  }

  if (body.show_name !== undefined) {
    return getTruthyBoolean(body.show_name);
  }

  if (body.isAnonymous !== undefined) {
    return !getTruthyBoolean(body.isAnonymous);
  }

  if (body.is_anonymous !== undefined) {
    return !getTruthyBoolean(body.is_anonymous);
  }

  return true;
};

const getLocationPayload = (body) => {
  if (body.location && typeof body.location === "object" && !Array.isArray(body.location)) {
    return {
      city: body.location.city || "",
      country: body.location.country || "",
    };
  }

  return {
    city: body["location[city]"] || body.city || "",
    country: body["location[country]"] || body.country || "",
  };
};

const sanitizePublicCase = (caseDoc) => {
  const sanitized = caseDoc.toObject ? caseDoc.toObject() : { ...caseDoc };

  if (!sanitized.showRequesterName && sanitized.user_id) {
    sanitized.user_id = {
      ...sanitized.user_id,
      full_name: "Anonymous",
    };
    delete sanitized.user_id.email;
  }

  return sanitized;
};

// ==================== PUBLIC CONTROLLERS ====================

// Get all active cases (pagination, filtering, sorting)
exports.getAllCases = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      urgency,
      isFeatured,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Only show active, approved cases to the public
    const query = { isActive: true, status: "active" };

    if (category) query.category = category;
    if (urgency) query.urgency = urgency;
    if (isFeatured !== undefined) query.isFeatured = isFeatured === "true";
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { titleAr: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { descriptionAr: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

    const cases = await Case.find(query)
      .populate("category", "name nameAr icon")
      .populate("user_id", "full_name email")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Case.countDocuments(query);

    res.status(200).json({
      success: true,
      count: cases.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: cases.map(sanitizePublicCase),
    });
  } catch (error) {
    console.error("Get all cases error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single case by ID
exports.getCaseById = async (req, res) => {
  try {
    const caseItem = await Case.findOne({
      _id: req.params.id,
      isActive: true,
    })
      .populate("category", "name nameAr description descriptionAr icon")
      .populate("user_id", "full_name email");

    if (!caseItem) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    res.status(200).json({ success: true, data: sanitizePublicCase(caseItem) });
  } catch (error) {
    console.error("Get case by ID error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get urgent cases
exports.getUrgentCases = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const cases = await Case.find({
      isActive: true,
      status: "active",
      urgency: { $in: ["high", "critical"] },
    })
      .sort({ urgency: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .populate("category", "name nameAr");

    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases.map(sanitizePublicCase),
    });
  } catch (error) {
    console.error("Get urgent cases error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get featured cases
exports.getFeaturedCases = async (req, res) => {
  try {
    const { limit = 8 } = req.query;

    const cases = await Case.find({
      isActive: true,
      status: "active",
      isFeatured: true,
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("category", "name nameAr");

    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases.map(sanitizePublicCase),
    });
  } catch (error) {
    console.error("Get featured cases error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Search cases
exports.searchCases = async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res
        .status(400)
        .json({ success: false, message: "Search query is required" });
    }

    const cases = await Case.find({
      isActive: true,
      status: "active",
      $or: [
        { title: { $regex: q, $options: "i" } },
        { titleAr: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
        { descriptionAr: { $regex: q, $options: "i" } },
      ],
    })
      .limit(parseInt(limit))
      .populate("category", "name nameAr");

    res.status(200).json({
      success: true,
      count: cases.length,
      data: cases.map(sanitizePublicCase),
    });
  } catch (error) {
    console.error("Search cases error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get cases by category
exports.getCasesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { limit = 10, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      category: categoryId,
      isActive: true,
      status: "active",
    };

    const cases = await Case.find(filter)
      .sort({ isFeatured: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("category", "name nameAr");

    const total = await Case.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: cases.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: cases.map(sanitizePublicCase),
    });
  } catch (error) {
    console.error("Get cases by category error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== USER CONTROLLERS ====================

// Create case (authenticated users; admin creations skip "pending")
exports.createCase = async (req, res) => {
  try {
    const {
      title,
      titleAr,
      description,
      descriptionAr,
      category,
      goalAmount,
      location,
      urgency,
      endDate,
    } = req.body;

    if (!category) {
      return res.status(400).json({ success: false, message: "Category is required" });
    }

    // Validate category exists
    let categoryExists;
    try {
      categoryExists = await Category.findById(category);
    } catch (err) {
      if (err.name === "CastError" && err.path === "_id") {
        return res.status(400).json({ success: false, message: "Category ID is invalid" });
      }
      throw err;
    }

    if (!categoryExists) {
      return res
        .status(400)
        .json({ success: false, message: "Category not found" });
    }

    // ── Main image ──────────────────────────────────────────────────────────
    let imageUrl = "";
    if (req.files?.image?.[0]) {
      try {
        const imageResult = await uploadToCloudinary(req.files.image[0].buffer, {
          folder: "cases",
        });
        imageUrl = imageResult.secure_url || "";
      } catch (uploadError) {
        console.error("Case image upload failed:", uploadError);
        return res.status(502).json({ success: false, message: "Case image upload failed. Please try again." });
      }
    } else if (req.body.image) {
      imageUrl = String(req.body.image).trim();
    }

    if (!imageUrl) {
      return res.status(400).json({ success: false, message: "Case image is required" });
    }

    // ── Gallery ─────────────────────────────────────────────────────────────
    // Only uploaded files
    let galleryUrls = [];
    if (req.files?.gallery?.length) {
      try {
        const uploaded = await uploadMultipleToCloudinary(req.files.gallery, {
          folder: "cases/gallery",
        });
        galleryUrls = uploaded;
      } catch (uploadError) {
        console.error("Case gallery upload failed:", uploadError);
        return res.status(502).json({ success: false, message: "Case gallery upload failed. Please try again." });
      }
    }

    const newCase = await Case.create({
      user_id: req.user._id,
      title,
      titleAr,
      description,
      descriptionAr,
      category,
      goalAmount,
      currentAmount: 0,
      image: imageUrl,
      gallery: galleryUrls,
      location: getLocationPayload(req.body),
      urgency: urgency || "medium",
      showRequesterName: getShowRequesterName(req.body),
      // Admins create cases that go live immediately; regular users need approval
      status: req.user.role === "admin" ? "active" : "pending",
      isActive: true,
      isFeatured: false,
      endDate: endDate || null,
    });

    res.status(201).json({
      success: true,
      message: "Case created successfully",
      data: newCase,
    });
  } catch (error) {
    console.error("Create case error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get the logged-in user's own cases
exports.getMyCases = async (req, res) => {
  try {
    const cases = await Case.find({ user_id: req.user._id })
      .populate("category", "name nameAr")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: cases.length, data: cases });
  } catch (error) {
    console.error("Get my cases error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update case (owner or admin)
exports.updateCase = async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    // Only the owner or an admin can update
    if (
      caseItem.user_id.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to update this case" });
    }

    const updates = { ...req.body };

    // Strip fields that shouldn't be updated via this endpoint
    delete updates._id;
    delete updates.createdAt;
    delete updates.currentAmount;
    delete updates.user_id;

    // Non-admins can't change moderation fields
    if (req.user.role !== "admin") {
      delete updates.status;
      delete updates.isActive;
      delete updates.isFeatured;
    }

    if (
      req.body.showRequesterName !== undefined ||
      req.body.showName !== undefined ||
      req.body.show_name !== undefined ||
      req.body.isAnonymous !== undefined ||
      req.body.is_anonymous !== undefined
    ) {
      updates.showRequesterName = getShowRequesterName(req.body);
    }

    if (
      req.body.location !== undefined ||
      req.body["location[city]"] !== undefined ||
      req.body["location[country]"] !== undefined ||
      req.body.city !== undefined ||
      req.body.country !== undefined
    ) {
      updates.location = getLocationPayload(req.body);
    }

    // ── Main image ──────────────────────────────────────────────────────────
    if (req.files?.image?.[0]) {
      const result = await uploadToCloudinary(req.files.image[0].buffer, {
        folder: "cases",
      });
      updates.image = result.secure_url;
      // Delete the old main image from Cloudinary (best-effort)
      if (caseItem.image) {
        deleteCloudinaryImages([caseItem.image]).catch(console.error);
      }
    }

    // ── Gallery ─────────────────────────────────────────────────────────────
    // Only touch gallery when the client sends an update (body.gallery or new files)
    if (req.files?.gallery?.length || updates.gallery !== undefined) {
      const oldGallery = caseItem.gallery || [];

      // Collect URLs the client wants to keep
      let keptUrls = [];
      if (updates.gallery !== undefined) {
        const arr = Array.isArray(updates.gallery)
          ? updates.gallery
          : [updates.gallery];
        keptUrls = arr.filter((u) => u && typeof u === "string");
      }

      // Upload any newly attached files
      let uploadedUrls = [];
      if (req.files?.gallery?.length) {
        uploadedUrls = await uploadMultipleToCloudinary(req.files.gallery, {
          folder: "cases/gallery",
        });
      }

      updates.gallery = [...keptUrls, ...uploadedUrls];

      // Clean up images the client no longer wants (best-effort)
      const removed = findRemovedImages(oldGallery, updates.gallery);
      if (removed.length) {
        deleteCloudinaryImages(removed).catch(console.error);
      }
    }

    updates.updatedAt = Date.now();

    const updated = await Case.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Case updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update case error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Record a donation
exports.donateToCase = async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid donation amount is required" });
    }

    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    if (!caseItem.isActive || caseItem.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "This case is not available for donations",
      });
    }

    caseItem.currentAmount += amount;
    caseItem.updatedAt = Date.now();

    if (caseItem.goalAmount && caseItem.currentAmount >= caseItem.goalAmount) {
      caseItem.status = "completed";
    }

    await caseItem.save();

    res.status(200).json({
      success: true,
      message: "Donation recorded successfully",
      data: {
        _id: caseItem._id,
        currentAmount: caseItem.currentAmount,
        goalAmount: caseItem.goalAmount,
        progressPercentage: caseItem.progressPercentage,
        status: caseItem.status,
      },
    });
  } catch (error) {
    console.error("Update donation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ADMIN CONTROLLERS ====================

// Soft-delete / restore by toggling isActive
exports.toggleCaseStatus = async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    caseItem.isActive = !caseItem.isActive;
    caseItem.status = caseItem.isActive ? "active" : "paused";
    caseItem.updatedAt = Date.now();

    await caseItem.save();

    res.status(200).json({
      success: true,
      message: caseItem.isActive
        ? "Case activated successfully"
        : "Case deactivated successfully",
      data: {
        _id: caseItem._id,
        isActive: caseItem.isActive,
        status: caseItem.status,
      },
    });
  } catch (error) {
    console.error("Toggle case status error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Toggle featured
exports.toggleFeatured = async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    caseItem.isFeatured = !caseItem.isFeatured;
    caseItem.updatedAt = Date.now();
    await caseItem.save();

    res.status(200).json({
      success: true,
      message: caseItem.isFeatured
        ? "Case marked as featured"
        : "Case removed from featured",
      data: { _id: caseItem._id, isFeatured: caseItem.isFeatured },
    });
  } catch (error) {
    console.error("Toggle featured error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve a pending case
exports.approveCase = async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    caseItem.status = "active";
    caseItem.isActive = true;
    caseItem.updatedAt = Date.now();
    await caseItem.save();

    res.status(200).json({
      success: true,
      message: "Case approved successfully",
      data: caseItem,
    });
  } catch (error) {
    console.error("Approve case error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Reject a pending case
exports.rejectCase = async (req, res) => {
  try {
    const caseItem = await Case.findById(req.params.id);

    if (!caseItem) {
      return res.status(404).json({ success: false, message: "Case not found" });
    }

    caseItem.status = "rejected";
    caseItem.isActive = false;
    caseItem.updatedAt = Date.now();
    await caseItem.save();

    res.status(200).json({
      success: true,
      message: "Case rejected",
      data: caseItem,
    });
  } catch (error) {
    console.error("Reject case error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: get all cases (optionally including inactive)
exports.getAllCasesAdmin = async (req, res) => {
  try {
    const { showInactive, status, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (showInactive !== "true") filter.isActive = true;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const cases = await Case.find(filter)
      .populate("category", "name nameAr")
      .populate("user_id", "full_name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Case.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: cases.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: cases,
    });
  } catch (error) {
    console.error("Get all cases admin error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
