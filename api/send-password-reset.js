/* global process */
import { Resend } from 'resend';
import { getFirestoreAccessToken } from './_lib/firestore.js';

export const config = { api: { bodyParser: true } };

const SEND_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute cooldown per email/IP
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

  const { email } = req.body;
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanEmail) {
    return res.status(400).json({ error: 'Please enter your email address.' });
  }

  const ip = getClientIp(req);
  
  // Rate limit check on both email and IP address
  const emailLimit = checkSendCooldown(cleanEmail);
  if (!emailLimit.allowed) {
    return res.status(429).json({
      error: `Please wait ${Math.ceil(emailLimit.retryAfterMs / 1000)} seconds before requesting another reset link.`
    });
  }

  const ipLimit = checkSendCooldown(`ip_${ip}`);
  if (!ipLimit.allowed) {
    return res.status(429).json({
      error: 'Too many requests from this device. Please try again later.'
    });
  }

  const apiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'Email service not configured. Add RESEND_API_KEY to your environment variables.'
    });
  }

  const resend = new Resend(apiKey);
  const projectId = process.env.FIREBASE_PROJECT_ID || 'boq-pro-72332';

  try {
    // 1. Get Firebase Access Token
    const token = await getFirestoreAccessToken();

    // 2. Call Google Identity Toolkit REST API to generate the password reset link
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:sendOobCode`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: cleanEmail,
        returnOobLink: true
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const errMsg = data.error?.message;
      if (errMsg === 'EMAIL_NOT_FOUND' || errMsg === 'USER_NOT_FOUND') {
        return res.status(404).json({ error: 'No account found with this email address.' });
      }
      throw new Error(data.error?.message || 'Failed to generate reset link.');
    }

    const oobLink = data.oobLink;
    if (!oobLink) {
      throw new Error('Verification link not returned by authorization server.');
    }

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Quantra <onboarding@quantra-extimator.xyz>';

    // 3. Send reset email via Resend
    const { error: resendErr } = await resend.emails.send({
      from: fromAddress,
      to: [cleanEmail],
      subject: 'Reset your Quantra password',
      text: `Reset your Quantra password by clicking this link: ${oobLink}\n\nIf you did not request this, please ignore this email.`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; padding: 40px; color: #f8fafc; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <span style="font-size: 26px; font-weight: 800; letter-spacing: 0.05em; color: #ffffff;">
              QUAN<span style="color: #3b82f6;">TRA</span>
            </span>
            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 5px;">
              Professional BOQ Management
            </div>
          </div>
          
          <div style="background: rgba(30, 41, 59, 0.5); padding: 30px; border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); margin-bottom: 30px;">
            <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #ffffff; text-align: center;">
              Reset Password Request
            </h2>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; text-align: center;">
              We received a request to reset the password for your Quantra account. Click the button below to secure your workspace and choose a new password.
            </p>
            
            <div style="text-align: center; margin: 30px 0 20px;">
              <a href="${oobLink}" style="display: inline-block; padding: 14px 36px; background: #1e293b; color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 14px; border: 1.5px solid #d4a017; box-shadow: 0 10px 20px rgba(0,0,0,0.3); transition: transform 0.2s;">
                Reset Password
              </a>
            </div>
            
            <div style="font-size: 11px; color: #64748b; text-align: center; margin-top: 20px;">
              This link is secure and will expire in 1 hour.
            </div>
          </div>
          
          <p style="color: #64748b; font-size: 12px; line-height: 1.6; text-align: center; margin-bottom: 0;">
            If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
          
          <hr style="border: 0; border-top: 1px solid rgba(255, 255, 255, 0.05); margin: 30px 0;" />
          
          <div style="text-align: center; font-size: 11px; color: #475569;">
            © ${new Date().getFullYear()} Quantra Enterprise. All rights reserved.
          </div>
        </div>
      `
    });

    if (resendErr) {
      throw new Error(resendErr.message || 'Failed to dispatch reset email.');
    }

    return res.status(200).json({ success: true, message: 'Password reset link sent successfully.' });
  } catch (err) {
    console.error('❌ Send reset link error:', err.message);
    return res.status(500).json({ error: err.message || 'Failed to process request.' });
  }
}
