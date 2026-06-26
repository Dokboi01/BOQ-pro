/* global process */
import { Resend } from 'resend';
import { requireFirebaseAuth } from './_lib/firebase-auth.js';
import { patchDocumentByPath } from './_lib/firestore.js';

export const config = { api: { bodyParser: true } };

const SEND_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute cooldown per user
const sendCooldownMap = new Map();

function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim();
}

function checkSendCooldown(identity) {
  const now = Date.now();
  const lastSent = sendCooldownMap.get(identity);

  if (lastSent && now - lastSent < SEND_LIMIT_WINDOW_MS) {
    return { allowed: false, retryAfterMs: SEND_LIMIT_WINDOW_MS - (now - lastSent) };
  }

  sendCooldownMap.set(identity, now);

  // Periodic cleanup
  if (sendCooldownMap.size > 1000) {
    for (const [key, val] of sendCooldownMap) {
      if (now - val > SEND_LIMIT_WINDOW_MS) {
        sendCooldownMap.delete(key);
      }
    }
  }

  return { allowed: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Email service not configured. Add RESEND_API_KEY to your Vercel environment variables.'
    });
  }

  const resend = new Resend(apiKey);

  try {
    const authClaims = await requireFirebaseAuth(req);
    const uid = String(authClaims?.user_id || authClaims?.sub || '').trim();
    const email = String(authClaims?.email || '').trim().toLowerCase();
    const fullName = String(authClaims?.name || 'User').trim();

    if (!email) {
      return res.status(400).json({ error: 'No email found in authentication token.' });
    }

    const ip = getClientIp(req);
    const identity = `${uid || email || ip}:send-verification`;
    const cooldown = checkSendCooldown(identity);

    if (!cooldown.allowed) {
      return res.status(429).json({
        error: 'Please wait a moment before requesting another verification code.',
        retryAfterMs: cooldown.retryAfterMs,
      });
    }

    // Generate 6-digit random code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins expiry

    // Save code to Firestore (will create/overwrite document at `verification_codes/{email}`)
    await patchDocumentByPath(`verification_codes/${email}`, {
      code,
      email,
      uid,
      expiresAt,
    });

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Quantra <onboarding@quantra.com>';

    // Send code via Resend
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: [email],
      subject: `${code} is your Quantra verification code`,
      text: `Your Quantra verification code is: ${code}\n\nThis code expires in 15 minutes.`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; padding: 40px; color: #f8fafc; border-radius: 16px;">
          <!-- Logo Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 0.04em;">
              Quantra
            </h1>
            <p style="color: #94a3b8; margin: 4px 0 0; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;">
              Professional BOQ Management
            </p>
          </div>

          <!-- Content Card -->
          <div style="background: #1e293b; padding: 32px; border-radius: 12px; border: 1px solid #334155; text-align: center;">
            <h2 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 16px;">
              Verify your email address
            </h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
              Hello ${fullName},<br/>
              Use the verification code below to confirm your email and activate your Quantra account:
            </p>

            <!-- OTP Code Display -->
            <div style="background: #0f172a; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 36px; font-weight: 700; color: #f59e0b; letter-spacing: 0.25em; display: inline-block; margin-bottom: 24px; padding-left: 28px;">
              ${code}
            </div>

            <p style="color: #64748b; font-size: 12px; margin: 0;">
              This code will expire in 15 minutes. If you did not request this, you can safely ignore this email.
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 32px; color: #64748b; font-size: 11px;">
            &copy; ${new Date().getFullYear()} Quantra. All rights reserved.
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Resend API Error:', error);
      return res.status(500).json({ error: error.message || 'Failed to send verification email.' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ Send verification code error:', err.message);
    return res.status(err.status || 500).json({ error: err.message || 'Failed to process request.' });
  }
}
