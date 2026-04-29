import { createVerify } from 'node:crypto';

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const CERT_CACHE_TTL_MS = 60 * 60 * 1000;

let cachedCerts = null;
let cachedCertsFetchedAt = 0;

function getProjectId() {
  return process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || null;
}

function base64UrlDecode(input) {
  const normalized = String(input || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function parseJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid authentication token format.');
  }

  return {
    header: JSON.parse(base64UrlDecode(parts[0])),
    payload: JSON.parse(base64UrlDecode(parts[1])),
    signature: parts[2],
    signedContent: `${parts[0]}.${parts[1]}`,
  };
}

async function getGoogleCerts(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && cachedCerts && now - cachedCertsFetchedAt < CERT_CACHE_TTL_MS) {
    return cachedCerts;
  }

  const response = await fetch(CERTS_URL);
  const payload = await response.json();

  if (!response.ok || !payload || typeof payload !== 'object') {
    throw new Error('Failed to fetch Firebase signing certificates.');
  }

  cachedCerts = payload;
  cachedCertsFetchedAt = now;
  return cachedCerts;
}

function verifySignature({ header, signature, signedContent }, certs) {
  const candidateCert = header?.kid ? certs?.[header.kid] : null;
  const entries = candidateCert ? [[header.kid, candidateCert]] : Object.entries(certs || {});
  const normalizedSignature = String(signature || '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const paddedSignature = normalizedSignature + '='.repeat((4 - (normalizedSignature.length % 4)) % 4);
  const signatureBuffer = Buffer.from(paddedSignature, 'base64');

  for (const [, certificate] of entries) {
    const verifier = createVerify('RSA-SHA256');
    verifier.update(signedContent);
    verifier.end();

    if (verifier.verify(certificate, signatureBuffer)) {
      return true;
    }
  }

  return false;
}

export async function verifyFirebaseIdToken(token) {
  const projectId = getProjectId();
  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is not configured.');
  }

  const { header, payload, signature, signedContent } = parseJwt(token);

  if (header?.alg !== 'RS256') {
    throw new Error('Unsupported authentication token algorithm.');
  }

  if (payload?.aud !== projectId) {
    throw new Error('Authentication token was issued for a different project.');
  }

  if (payload?.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error('Authentication token issuer is invalid.');
  }

  if (!payload?.sub) {
    throw new Error('Authentication token is missing a subject.');
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = Number(payload.exp);
  if (!Number.isFinite(exp) || now >= exp) {
    throw new Error('Authentication token has expired.');
  }

  const iat = Number(payload.iat);
  if (Number.isFinite(iat) && iat > now + 300) {
    throw new Error('Authentication token issue time is invalid.');
  }

  const certs = await getGoogleCerts();
  const verified = verifySignature({ header, signature, signedContent }, certs)
    || verifySignature({ header, signature, signedContent }, await getGoogleCerts(true));

  if (!verified) {
    throw new Error('Authentication token signature is invalid.');
  }

  return payload;
}

export function getBearerToken(req) {
  const header = String(req.headers.authorization || req.headers.Authorization || '').trim();
  if (!header) return null;

  const [scheme, ...rest] = header.split(/\s+/);
  if (scheme?.toLowerCase() !== 'bearer' || rest.length === 0) {
    return null;
  }

  return rest.join(' ').trim() || null;
}

export async function requireFirebaseAuth(req) {
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }

  try {
    return await verifyFirebaseIdToken(token);
  } catch (error) {
    if (!error.status) {
      error.status = /authentication|token/i.test(String(error.message || '')) ? 401 : 500;
    }
    throw error;
  }
}
