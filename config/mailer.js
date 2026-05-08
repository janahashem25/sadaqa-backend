const nodemailer = require('nodemailer');

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
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const emailFrom = process.env.EMAIL_FROM || `Sadaqa <${process.env.SMTP_USER || 'no-reply@example.com'}>`;

const verifyMailerConfig = async () => {
  if (!isMailerConfigured) {
    console.warn('⚠️  SMTP mailer is not configured. Forgot password emails will not be sent.');
    return;
  }

  try {
    await transporter.verify();
    console.log('✅ SMTP mailer configured and ready.');
  } catch (error) {
    console.warn('⚠️  SMTP mailer verification failed:', error.message);
  }
};

const sendPasswordResetEmail = async (recipientEmail, options = {}) => {
  if (!isMailerConfigured) {
    throw new Error('Mailer is not configured');
  }

  const { resetUrl, token, fullName = 'Sadaqa user' } = options;
  const subject = 'Sadaqa Password Reset Instructions';
  const text = `Hello ${fullName},\n\n` +
    `A password reset request was received for your Sadaqa account.\n\n` +
    `Use the link below to reset your password:\n${resetUrl}\n\n` +
    `If you did not request this, ignore this message.\n\n` +
    `Your reset token (for direct use): ${token}\n\n` +
    `Thanks,\nThe Sadaqa Team`;

  const html = `
    <p>Hello ${fullName},</p>
    <p>A password reset request was received for your Sadaqa account.</p>
    <p><strong>Reset link:</strong><br /><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If your client does not support links, paste the following URL into your browser:</p>
    <p>${resetUrl}</p>
    <p><strong>Reset token:</strong><br />${token}</p>
    <p>If you did not request this, ignore this message.</p>
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
};
