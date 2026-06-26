/* global process */
import { Resend } from 'resend';
import { requireFirebaseAuth } from './_lib/firebase-auth.js';

export const config = { api: { bodyParser: true } };

const INVITE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const INVITE_LIMIT_MAX_REQUESTS = 20;
const inviteRateLimitMap = new Map();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['editor', 'viewer'];

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim();
}

function checkInviteRateLimit(identity) {
  const now = Date.now();
  const entry = inviteRateLimitMap.get(identity);

  if (entry && now - entry.windowStart < INVITE_LIMIT_WINDOW_MS) {
    if (entry.count >= INVITE_LIMIT_MAX_REQUESTS) {
      return { allowed: false, retryAfterMs: INVITE_LIMIT_WINDOW_MS - (now - entry.windowStart) };
    }

    entry.count += 1;
    return { allowed: true };
  }

  inviteRateLimitMap.set(identity, { windowStart: now, count: 1 });

  if (inviteRateLimitMap.size > 1000) {
    for (const [key, value] of inviteRateLimitMap) {
      if (now - value.windowStart > INVITE_LIMIT_WINDOW_MS) {
        inviteRateLimitMap.delete(key);
      }
    }
  }

  return { allowed: true };
}

export default async function handler(req, res) {
  // Only allow POST
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
    const { toEmail, inviterName, projectName, role, projectId } = req.body;
    const uid = String(authClaims?.user_id || authClaims?.sub || '').trim();
    const email = String(authClaims?.email || '').trim().toLowerCase();
    const ip = getClientIp(req);
    const identity = `${uid || email || ip || 'authenticated'}:invite-collaborator`;
    const limit = checkInviteRateLimit(identity);

    if (!limit.allowed) {
      return res.status(429).json({
        error: 'You are sending too many invites. Please wait before trying again.',
        retryAfterMs: limit.retryAfterMs,
      });
    }

    const normalizedToEmail = String(toEmail || '').trim().toLowerCase();
    const safeInviterName = String(inviterName || '').trim();
    const safeProjectName = String(projectName || '').trim();
    const safeRole = String(role || '').trim().toLowerCase();
    const safeProjectId = String(projectId || '').trim();

    if (!normalizedToEmail || !safeProjectName) {
      return res.status(400).json({ error: 'Missing required fields: toEmail, projectName' });
    }

    if (!EMAIL_REGEX.test(normalizedToEmail)) {
      return res.status(400).json({ error: 'Please provide a valid recipient email address.' });
    }

    if (!VALID_ROLES.includes(safeRole)) {
      return res.status(400).json({ error: "Role must be 'editor' or 'viewer'." });
    }

    if (!email) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const fromAddress = process.env.RESEND_FROM_EMAIL || 'Quantra <onboarding@quantra.com>';
    const appUrl = 'https://boq-pro.vercel.app';
    const projectUrl = safeProjectId ? `${appUrl}/projects/${safeProjectId}` : appUrl;
    const roleCapitalized = safeRole.charAt(0).toUpperCase() + safeRole.slice(1);

    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [normalizedToEmail],
      subject: `You've been invited to collaborate on ${safeProjectName}`,
      text: [
        `You've been invited to collaborate on ${safeProjectName}`,
        '',
        safeInviterName
          ? `${safeInviterName} has added you as a ${roleCapitalized} on the project "${safeProjectName}".`
          : `You have been added as a ${roleCapitalized} on the project "${safeProjectName}".`,
        '',
        `Open Quantra to get started: ${projectUrl}`,
        '',
        'Quantra — Professional BOQ Platform',
      ].join('\n'),
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; padding: 0;">
          <!-- Header -->
          <div style="background: #0f172a; padding: 36px 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.04em;">
              Quantra
            </h1>
            <p style="color: #64748b; margin: 6px 0 0; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase;">
              Professional BOQ Platform
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 36px 32px;">
            <h2 style="color: #0f172a; font-size: 20px; font-weight: 700; margin: 0 0 10px;">
              You've been invited to collaborate
            </h2>
            <p style="color: #64748b; font-size: 14px; line-height: 1.7; margin: 0 0 28px;">
              ${escapeHtml(safeInviterName)
                ? `<strong style="color: #0f172a;">${escapeHtml(safeInviterName)}</strong> has added you to a project on Quantra.`
                : 'You have been added to a project on Quantra.'}
              You now have access as shown below.
            </p>

            <!-- Project Card -->
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 24px; margin-bottom: 28px;">
              <!-- Project Name -->
              <div style="margin-bottom: 18px;">
                <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">
                  PROJECT
                </span>
                <p style="font-size: 17px; font-weight: 700; color: #0f172a; margin: 5px 0 0;">
                  ${escapeHtml(safeProjectName)}
                </p>
              </div>

              <!-- Divider -->
              <div style="border-top: 1px solid #f1f5f9; margin-bottom: 18px;"></div>

              <!-- Inviter -->
              ${safeInviterName ? `
              <div style="margin-bottom: 18px;">
                <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">
                  INVITED BY
                </span>
                <p style="font-size: 14px; font-weight: 600; color: #334155; margin: 5px 0 0;">
                  ${escapeHtml(safeInviterName)}
                </p>
              </div>
              ` : ''}

              <!-- Role Badge -->
              <div>
                <span style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.08em;">
                  YOUR ROLE
                </span>
                <div style="margin-top: 8px;">
                  <span style="
                    display: inline-block;
                    background: rgba(245, 158, 11, 0.15);
                    color: #d97706;
                    border: 1px solid #f59e0b;
                    border-radius: 999px;
                    padding: 4px 14px;
                    font-size: 12px;
                    font-weight: 700;
                    letter-spacing: 0.04em;
                  ">
                    ${escapeHtml(roleCapitalized)}
                  </span>
                </div>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin-bottom: 8px;">
              <a href="${projectUrl}" style="
                display: inline-block;
                background: #0f172a;
                color: white;
                text-decoration: none;
                font-size: 14px;
                font-weight: 700;
                padding: 14px 36px;
                border-radius: 10px;
                border: 2px solid #f59e0b;
                letter-spacing: 0.02em;
              ">
                Open Quantra
              </a>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 16px 0 0;">
              If the button doesn't work, copy and paste this link into your browser:<br/>
              <a href="${projectUrl}" style="color: #f59e0b; word-break: break-all;">${projectUrl}</a>
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #0f172a; padding: 20px 32px; text-align: center; border-top: 1px solid #1e293b;">
            <p style="color: #475569; font-size: 11px; margin: 0;">
              &copy; ${new Date().getFullYear()} Quantra &mdash; Professional BOQ Platform. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: error.message || 'Failed to send invite email' });
    }

    return res.status(200).json({ success: true, id: data?.id });
  } catch (err) {
    console.error('Invite collaborator error:', err);
    return res.status(Number(err.status || 500)).json({ error: err.message || 'Internal server error' });
  }
}
