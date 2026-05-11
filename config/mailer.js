const { Resend } = require('resend');

const isMailerConfigured = Boolean(process.env.RESEND_API_KEY);

const resend = isMailerConfigured
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const emailFrom = process.env.EMAIL_FROM || 'Sadaqa <noreply@sadaqa.app>';

const verifyMailerConfig = async () => {
  if (!isMailerConfigured) {
    console.warn(
      "Resend API key is not configured. Forgot password emails will not be sent."
    );
    return;
  }

  try {
    // Test the API key by attempting to get domains (lightweight call)
    await resend.domains.list();
    console.log("Resend mailer configured and ready.");
  } catch (error) {
    console.warn("Resend mailer verification failed:", error.message);
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

  const subject = "Sadaqa Password Reset Instructions";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Sadaqa Password Reset</h1>
      </div>

      <p>Hello ${fullName},</p>

      <p><strong>A password reset was requested for your account.</strong></p>

      <p>Use the secure link below to reset your password:</p>

      <a href="${resetUrl}" class="button">Reset My Password</a>

      <p><strong>This link expires in ${expiresInMinutes} minutes.</strong></p>

      <div class="warning">
        <p><strong>Security Notice:</strong> If you did not request this password reset, please ignore this email. No password changes have been made to your account.</p>
      </div>

      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>

      <p>Thanks,<br/>The Sadaqa Team</p>

      <div class="footer">
        <p>This is an automated email. Please do not reply to this message.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Hello ${fullName},

A password reset was requested for your account.

Use the link below to reset your password:
${resetUrl}

This link expires in ${expiresInMinutes} minutes.

Security Notice: If you did not request this password reset, please ignore this email. No password changes have been made to your account.

Thanks,
The Sadaqa Team

---
This is an automated email. Please do not reply to this message.
  `.trim();

  const result = await resend.emails.send({
    from: emailFrom,
    to: recipientEmail,
    subject,
    html,
    text,
  });

  return result;
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

  const subject = "Security Notice: Password Reset Requested";
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Security Notice</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .security { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; }
        .footer { font-size: 12px; color: #666; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Security Notice</h1>
      </div>

      <p>Hello ${fullName},</p>

      <div class="security">
        <p><strong>A password reset was requested for your account.</strong></p>
        <p><strong>Time:</strong> ${resetRequestedAt}<br/>
        <strong>IP Address:</strong> ${ipAddress}</p>
      </div>

      <p><strong>If this was you:</strong> Follow the password reset instructions in the separate email we sent.</p>

      <p><strong>If this was not you:</strong> You can safely ignore the reset email. Consider changing your password after signing in to ensure your account security.</p>

      <p>Thanks,<br/>The Sadaqa Team</p>

      <div class="footer">
        <p>This is an automated security notification. Please do not reply to this message.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
Hello ${fullName},

SECURITY NOTICE: A password reset was requested for your account.

Time: ${resetRequestedAt}
IP Address: ${ipAddress}

If this was you: Follow the password reset instructions in the separate email we sent.

If this was not you: You can safely ignore the reset email. Consider changing your password after signing in to ensure your account security.

Thanks,
The Sadaqa Team

---
This is an automated security notification. Please do not reply to this message.
  `.trim();

  const result = await resend.emails.send({
    from: emailFrom,
    to: recipientEmail,
    subject,
    html,
    text,
  });

  return result;
};

module.exports = {
  isMailerConfigured,
  verifyMailerConfig,
  sendPasswordResetEmail,
  sendPasswordResetSecurityNotification,
};
