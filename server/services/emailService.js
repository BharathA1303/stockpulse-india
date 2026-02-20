/**
 * EmailService — Handles OTP generation, storage, and email sending.
 *
 * Uses nodemailer with configurable SMTP.
 * OTP codes expire after a configurable timeout (default 2 minutes).
 */

import nodemailer from 'nodemailer';

// ── OTP Storage (in-memory) ──
// key: email (lowercase), value: { code, expiresAt, verified }
const otpStore = new Map();

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes
const OTP_COOLDOWN_MS = 30 * 1000; // 30 seconds between resends

/**
 * Create nodemailer transporter from environment variables.
 * Supports Gmail, Outlook, custom SMTP.
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';

  if (!user || !pass) {
    console.warn('⚠️  SMTP_USER / SMTP_PASS not set — emails will fail.');
    return null;
  }

  // Port 465 = direct SSL (secure: true), Port 587 = STARTTLS (secure: false)
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const isSecure = port === 465;

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,       // true for 465 (SSL), false for 587 (STARTTLS)
    auth: { user, pass },
    family: 4,              // Force IPv4 — Render can't route IPv6
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

  console.log(`📧 SMTP configured: ${host}:${port} (${isSecure ? 'SSL' : 'STARTTLS'}, IPv4) as ${user}`);
  return transport;
}

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
}

/**
 * Generate a random numeric OTP of given length.
 */
function generateOTP(length = OTP_LENGTH) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
}

/**
 * Send OTP to an email address.
 * Returns { success, message } or throws.
 */
export async function sendOTP(email, purpose = 'verification') {
  const normalizedEmail = email.trim().toLowerCase();

  // Check cooldown — prevent spam
  const existing = otpStore.get(normalizedEmail);
  if (existing && existing.sentAt && (Date.now() - existing.sentAt) < OTP_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - existing.sentAt)) / 1000);
    return { success: false, message: `Please wait ${waitSec}s before requesting another code.` };
  }

  const code = generateOTP();
  const expiresAt = Date.now() + OTP_EXPIRY_MS;

  // Store OTP
  otpStore.set(normalizedEmail, {
    code,
    expiresAt,
    verified: false,
    sentAt: Date.now(),
    attempts: 0,
  });

  // Build email
  const subjectMap = {
    verification: 'StockPulse India — Email Verification Code',
    login: 'StockPulse India — Login Verification Code',
  };

  const purposeText = purpose === 'login' ? 'log in to' : 'verify your email for';

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; background: #0e1319; border-radius: 12px; overflow: hidden; border: 1px solid #1e2530;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%); padding: 28px 32px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 700;">
          📈 StockPulse<span style="color: #00d09c; font-size: 13px; vertical-align: super;">India</span>
        </h1>
      </div>
      <div style="padding: 32px;">
        <p style="color: #d1d4dc; font-size: 15px; margin: 0 0 8px 0;">Hi there,</p>
        <p style="color: #848e9c; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          Use the following code to ${purposeText} your StockPulse account. This code is valid for <strong style="color: #d1d4dc;">2 minutes</strong>.
        </p>
        <div style="background: #1a1f2e; border: 1px solid #2a3040; border-radius: 10px; padding: 20px; text-align: center; margin: 0 0 24px 0;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: 'Courier New', monospace;">
            ${code}
          </span>
        </div>
        <p style="color: #848e9c; font-size: 13px; line-height: 1.6; margin: 0;">
          If you didn't request this code, please ignore this email. Do not share this code with anyone.
        </p>
      </div>
      <div style="padding: 16px 32px; background: #0a0d12; border-top: 1px solid #1e2530; text-align: center;">
        <p style="color: #5a6270; font-size: 11px; margin: 0;">
          © StockPulse India — Simulated Trading Platform
        </p>
      </div>
    </div>
  `;

  const mailer = getTransporter();
  if (!mailer) {
    // For development without SMTP: log the code to console
    console.log(`\n📧 [DEV] OTP for ${normalizedEmail}: ${code} (expires in 2 min)\n`);
    return { success: true, message: 'Verification code sent to your email.', dev: true };
  }

  try {
    await mailer.sendMail({
      from: `"StockPulse India" <${process.env.SMTP_USER}>`,
      to: normalizedEmail,
      subject: subjectMap[purpose] || subjectMap.verification,
      html: htmlBody,
    });

    return { success: true, message: 'Verification code sent to your email.' };
  } catch (err) {
    console.error('Email send error:', err.message);
    // Still store the OTP so dev can see in logs
    console.log(`📧 [FALLBACK] OTP for ${normalizedEmail}: ${code}`);
    return { success: false, message: 'Failed to send email. Please try again.', emailError: true };
  }
}

/**
 * Verify an OTP code for a given email.
 * Returns { success, message }
 */
export function verifyOTP(email, code) {
  const normalizedEmail = email.trim().toLowerCase();
  const entry = otpStore.get(normalizedEmail);

  if (!entry) {
    return { success: false, message: 'No verification code found. Please request a new one.' };
  }

  if (entry.verified) {
    return { success: true, message: 'Email already verified.' };
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalizedEmail);
    return { success: false, message: 'Code expired. Please request a new one.', expired: true };
  }

  entry.attempts += 1;

  if (entry.attempts > 5) {
    otpStore.delete(normalizedEmail);
    return { success: false, message: 'Too many attempts. Please request a new code.', expired: true };
  }

  if (entry.code !== code.trim()) {
    return { success: false, message: 'Invalid verification code. Please try again.' };
  }

  // Mark as verified
  entry.verified = true;
  otpStore.set(normalizedEmail, entry);

  return { success: true, message: 'Email verified successfully!' };
}

/**
 * Check if an email is currently verified (OTP passed).
 */
export function isEmailVerified(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const entry = otpStore.get(normalizedEmail);
  return entry?.verified === true;
}

/**
 * Clear OTP entry for an email (after successful signup/login).
 */
export function clearOTP(email) {
  otpStore.delete(email.trim().toLowerCase());
}

/**
 * Get remaining time (in seconds) for an OTP.
 */
export function getOTPTimeRemaining(email) {
  const normalizedEmail = email.trim().toLowerCase();
  const entry = otpStore.get(normalizedEmail);
  if (!entry || Date.now() > entry.expiresAt) return 0;
  return Math.ceil((entry.expiresAt - Date.now()) / 1000);
}
