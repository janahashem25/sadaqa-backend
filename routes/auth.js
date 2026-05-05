const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, role, phone, city } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedName = String(full_name || "").trim();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const user = await User.create({
      full_name: normalizedName,
      email: normalizedEmail,
      password_hash: password,
      role,
      phone: String(phone || "").trim(),
      city: String(city || "").trim(),
    });

    res.status(201).json({
      token: generateToken(user._id),
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.is_active) {
      return res.status(403).json({ message: "Account disabled" });
    }

    res.json({
      token: generateToken(user._id),
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ME
router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
