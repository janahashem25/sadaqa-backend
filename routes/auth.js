const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { sendPasswordResetEmail, isMailerConfigured } = require("../config/mailer");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

function getFrontendBaseUrl(req) {
  const explicitBaseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL;
  if (explicitBaseUrl) {
    return explicitBaseUrl;
  }

  const originHeader = String(req.get("origin") || "").trim();
  if (originHeader) {
    return originHeader;
  }

  const refererHeader = String(req.get("referer") || "").trim();
  if (refererHeader) {
    try {
      return new URL(refererHeader).origin;
    } catch (error) {
      console.warn("Invalid referer while building reset URL:", error.message);
    }
  }

  return "http://localhost:5173";
}

const resetPasswordHandler = async (req, res) => {
  try {
    const password =
      req.body.password || req.body.newPassword || req.body.confirmPassword;

    if (!password || String(password).length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const resetToken = String(req.params.token || req.body.token || "").trim();
    if (!resetToken) {
      return res.status(400).json({ message: "Reset token is required" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await User.findOne({
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Reset token is invalid or expired" });
    }

    user.password_hash = password;
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

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

// FORGOT PASSWORD
router.post("/forgot-password", async (req, res) => {
  try {
    const normalizedEmail = String(req.body.email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.json({
        message: "If an account with that email exists, a reset link has been created.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.reset_password_token = hashedToken;
    user.reset_password_expires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const frontendBaseUrl = getFrontendBaseUrl(req);
    const resetUrl = `${frontendBaseUrl.replace(/\/$/, "")}/reset-password/${resetToken}`;
    const shouldReturnResetLink =
      !isMailerConfigured || process.env.SHOW_RESET_LINK === "true";

    if (isMailerConfigured) {
      try {
        await sendPasswordResetEmail(user.email, {
          fullName: user.full_name,
          resetUrl,
          token: resetToken,
        });
      } catch (emailError) {
        console.error("Failed to send password reset email:", emailError.message);
      }
    }

    res.json({
      success: true,
      message: isMailerConfigured
        ? "If an account with that email exists, password reset instructions have been sent."
        : "If an account with that email exists, a reset link has been generated.",
      ...(shouldReturnResetLink
        ? {
            resetToken,
            resetUrl,
          }
        : {}),
      expiresAt: user.reset_password_expires,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// RESET PASSWORD
router.post("/reset-password", resetPasswordHandler);
router.post("/reset-password/:token", resetPasswordHandler);

// ME
router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

module.exports = router;
