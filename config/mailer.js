const nodemailer = require("nodemailer");

const isMailerConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
);

const transporter = isMailerConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure:
        process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const emailFrom =
  process.env.EMAIL_FROM ||
  `Sadaqa <${process.env.SMTP_USER || "no-reply@example.com"}>`;

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const verifyMailerConfig = async () => {
  if (!isMailerConfigured) {
    console.warn(
      "SMTP mailer is not configured. Forgot password emails will not be sent."
    );
    return;
  }

  try {
    await transporter.verify();
    console.log("SMTP mailer configured and ready.");
  } catch (error) {
    console.warn("SMTP mailer verification failed:", error.message);
  }
};

const sendPasswordResetEmail = async (recipientEmail, options = {}) => {
  if (!isMailerConfigured) {
    throw new Error("Mailer is not configured");
  }

  const {
    resetUrl,
    fullName = "Sadaqa user",
    expiresInMinutes = 20,
  } = options;
  const safeName = escapeHtml(fullName);
  const safeResetUrl = escapeHtml(resetUrl);
  const subject = "Sadaqa Password Reset Instructions";
  const text =
    `Hello ${fullName},\n\n` +
    `A password reset was requested for your account.\n\n` +
    `Use the link below to reset your password:\n${resetUrl}\n\n` +
    `This link expires in ${expiresInMinutes} minutes.\n\n` +
    `If you did not request this, ignore this email. No password changes have been made.\n\n` +
    `Thanks,\nThe Sadaqa Team`;

  const html = `
    <p>Hello ${safeName},</p>
    <p><strong>A password reset was requested for your account.</strong></p>
    <p>Use the secure link below to reset your password:</p>
    <p><a href="${safeResetUrl}">${safeResetUrl}</a></p>
    <p>This link expires in <strong>${expiresInMinutes} minutes</strong>.</p>
    <p>If you did not request this, ignore this email. No password changes have been made.</p>
    <p>Thanks,<br/>The Sadaqa Team</p>
  `;

  return transporter.sendMail({
    from: emailFrom,
    to: recipientEmail,
    subject,
    text,
    html,
  });
};

const sendPasswordResetSecurityNotification = async (
  recipientEmail,
  options = {}
) => {
  if (!isMailerConfigured) {
    throw new Error("Mailer is not configured");
  }

  const {
    fullName = "Sadaqa user",
    resetRequestedAt = new Date().toISOString(),
    ipAddress = "Unavailable",
  } = options;
  const safeName = escapeHtml(fullName);
  const safeTimestamp = escapeHtml(resetRequestedAt);
  const safeIpAddress = escapeHtml(ipAddress);
  const subject = "Security Notice: Password Reset Requested";
  const text =
    `Hello ${fullName},\n\n` +
    `A password reset was requested for your account.\n` +
    `Time: ${resetRequestedAt}\n` +
    `IP address: ${ipAddress}\n\n` +
    `If this was you, follow the password reset instructions email.\n` +
    `If this was not you, you can ignore the reset email and consider changing your password after signing in.\n\n` +
    `Thanks,\nThe Sadaqa Team`;

  const html = `
    <p>Hello ${safeName},</p>
    <p><strong>A password reset was requested for your account.</strong></p>
    <p>Time: ${safeTimestamp}<br />IP address: ${safeIpAddress}</p>
    <p>If this was you, follow the password reset instructions email.</p>
    <p>If this was not you, you can ignore the reset email and consider changing your password after signing in.</p>
    <p>Thanks,<br/>The Sadaqa Team</p>
  `;

  return transporter.sendMail({
    from: emailFrom,
    to: recipientEmail,
    subject,
    text,
    html,
  });
};

module.exports = {
  isMailerConfigured,
  verifyMailerConfig,
  sendPasswordResetEmail,
  sendPasswordResetSecurityNotification,
};
