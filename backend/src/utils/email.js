const nodemailer = require('nodemailer');
const logger = require('./logger');

// ─── Transporter ─────────────────────────────────────────────────────────────

let _transporter = null;
let _etherealUser = null; // cached for log messages

/**
 * Build and cache the Nodemailer transporter.
 *
 * Development  → auto-creates a free Ethereal test account on first call.
 *                Emails never leave Ethereal; you can preview them at the URL
 *                logged to the console.
 *
 * Production   → uses the SMTP_* environment variables (Gmail, SendGrid, etc.)
 */
const getTransporter = async () => {
  if (_transporter) return _transporter;

  const hasRealCredentials = process.env.SMTP_USER && process.env.SMTP_PASS &&
    process.env.SMTP_USER !== 'dev@ethereal.email';

  if (hasRealCredentials) {
    // Real SMTP credentials configured — use them regardless of NODE_ENV
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    logger.info(`📧  SMTP transporter ready → ${process.env.SMTP_HOST} as ${process.env.SMTP_USER}`);
  } else {
    // No credentials — auto-create a free Ethereal test account
    const testAccount = await nodemailer.createTestAccount();
    _etherealUser = testAccount.user;

    logger.info('─────────────────────────────────────────────────');
    logger.info('📧  Dev email account created (Ethereal — no real SMTP configured)');
    logger.info(`    User : ${testAccount.user}`);
    logger.info('    Preview emails at https://ethereal.email');
    logger.info('─────────────────────────────────────────────────');

    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  }

  return _transporter;
};

// ─── Core send function ───────────────────────────────────────────────────────

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `LMS Platform <noreply@lms.local>`,
      to,
      subject,
      html,
      text,
    });

    logger.info(`✉️  Email sent → ${to} | Subject: "${subject}" | ID: ${info.messageId}`);

    // In development, log the Ethereal preview URL so you can read the email
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info(`🔗  Preview email at: ${previewUrl}`);
      }
    }

    return info;
  } catch (err) {
    logger.error(`❌  Email failed → ${to}: ${err.message}`);
    throw err;
  }
};

// ─── Email Templates ──────────────────────────────────────────────────────────

const welcomeStudentTemplate = ({ name, email, password, loginUrl, appName }) => ({
  subject: `Welcome to ${appName} — Your Login Credentials`,
  html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:40px 48px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:700;letter-spacing:-0.5px;">${appName}</h1>
              <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">Learning Management System</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:48px;">
              <h2 style="color:#1e293b;margin:0 0 16px;font-size:22px;">Welcome aboard, ${name}! 🎉</h2>
              <p style="color:#475569;line-height:1.7;margin:0 0 24px;">Your account has been created. Below are your login credentials. Please keep them safe.</p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;">
                          <span style="color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email / Username</span>
                          <p style="color:#1e293b;margin:4px 0 0;font-size:16px;font-weight:500;">${email}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-top:1px solid #e2e8f0;">
                          <span style="color:#64748b;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Temporary Password</span>
                          <p style="color:#4f46e5;margin:4px 0 0;font-size:20px;font-weight:700;font-family:monospace;letter-spacing:2px;">${password}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color:#f59e0b;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px 16px;font-size:14px;margin:0 0 32px;">
                ⚠️ Please change your password immediately after your first login.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.3px;">Login to Your Account →</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 48px;text-align:center;">
              <p style="color:#94a3b8;font-size:13px;margin:0;">© ${new Date().getFullYear()} ${appName}. All rights reserved.</p>
              <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">If you didn't expect this email, please contact your administrator.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `,
  text: `Welcome to ${appName}!\n\nYour login credentials:\nEmail: ${email}\nPassword: ${password}\n\nLogin at: ${loginUrl}\n\nPlease change your password after first login.`,
});

const passwordResetTemplate = ({ name, resetUrl, appName }) => ({
  subject: `${appName} — Password Reset Request`,
  html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px 48px;text-align:center;">
              <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;">${appName}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:48px;">
              <h2 style="color:#1e293b;margin:0 0 16px;font-size:22px;">Password Reset Request</h2>
              <p style="color:#475569;line-height:1.7;margin:0 0 32px;">Hi ${name}, we received a request to reset your password. Click the button below to set a new password. This link expires in 1 hour.</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;">Reset Password →</a>
                  </td>
                </tr>
              </table>
              <p style="color:#94a3b8;font-size:13px;margin:32px 0 0;text-align:center;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 48px;text-align:center;">
              <p style="color:#94a3b8;font-size:13px;margin:0;">© ${new Date().getFullYear()} ${appName}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `,
  text: `Hi ${name},\n\nReset your password at: ${resetUrl}\n\nThis link expires in 1 hour.`,
});

module.exports = { sendEmail, welcomeStudentTemplate, passwordResetTemplate };
