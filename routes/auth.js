const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { forgotPasswordLimiter } = require("../middleware/rateLimit");
const {
  sendPasswordResetEmail,
  sendPasswordResetSecurityNotification,
  isMailerConfigured,
} = require("../config/mailer");

const RESET_TOKEN_TTL_MINUTES = Math.max(
  5,
  Number(process.env.RESET_TOKEN_TTL_MINUTES || 15)
);

function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }

  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  if (password.length < minLength) {
    return { valid: false, message: `Password must be at least ${minLength} characters long` };
  }

  if (!hasUpperCase) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!hasLowerCase) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!hasNumbers) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  });

function getFrontendBaseUrl(req) {
  const explicitBaseUrl = process.env.APP_URL || process.env.FRONTEND_URL || process.env.CLIENT_URL;
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

function shouldReturnResetDebugData() {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.SHOW_RESET_LINK === "true" || !isMailerConfigured)
  );
}

function getRequestIp(req) {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "").trim();
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "Unavailable";
}

const resetPasswordHandler = async (req, res) => {
  try {
    const password = req.body.password || req.body.newPassword || "";
    const confirmPassword = req.body.confirmPassword || password;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    const resetToken = String(req.params.token || req.body.token || "").trim();
    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required"
      });
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
      return res.status(400).json({
        success: false,
        message: "Reset token is invalid or expired"
      });
    }

    // Check if token has already been used (additional security)
    if (!user.reset_password_token) {
      return res.status(400).json({
        success: false,
        message: "This reset token has already been used"
      });
    }

    // Set new password - this will be hashed by the pre-save hook
    user.password_hash = password;
    user.reset_password_token = null;
    user.reset_password_expires = null;

    await user.save();

    res.json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({
      success: false,
      message: "An error occurred while resetting password"
    });
  }
};

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { full_name, email, password, role, phone, city } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedName = String(full_name || "").trim();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Email already exists"
      });
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
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({
      success: false,
      message: "An error occurred during registration"
    });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: "Account disabled"
      });
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      success: false,
      message: "An error occurred during login"
    });
  }
});

// FORGOT PASSWORD
router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const normalizedEmail = String(req.body.email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    const genericSuccessMessage =
      "If an account with that email exists, password reset instructions have been sent.";

    if (!user) {
      return res.json({
        success: true,
        message: genericSuccessMessage,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.reset_password_token = hashedToken;
    user.reset_password_expires = new Date(
      Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000
    );
    await user.save();

    const frontendBaseUrl = getFrontendBaseUrl(req);
    const resetUrl = `${frontendBaseUrl.replace(
      /\/$/,
      ""
    )}/reset-password/${resetToken}`;
    const requestMetadata = {
      fullName: user.full_name,
      resetUrl,
      expiresInMinutes: RESET_TOKEN_TTL_MINUTES,
      resetRequestedAt: new Date().toISOString(),
      ipAddress: getRequestIp(req),
    };

    if (isMailerConfigured) {
      try {
        await Promise.all([
          sendPasswordResetEmail(user.email, requestMetadata),
          sendPasswordResetSecurityNotification(user.email, requestMetadata),
        ]);
      } catch (emailError) {
        console.error(
          "Failed to send password reset email:",
          emailError.message
        );
        // Don't return error to user to prevent email enumeration
      }
    }

    res.json({
      success: true,
      message: genericSuccessMessage,
      expiresAt: user.reset_password_expires,
      ...(shouldReturnResetDebugData()
        ? {
            resetUrl,
            debugNotice:
              "Resend API key is not configured, so this reset email was not actually sent. Use the debug reset link below for local development.",
            securityNotificationPreview:
              "A password reset was requested for your account.",
          }
        : {}),
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({
      success: false,
      message: "An error occurred while processing your request"
    });
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
