function getRequestOrigin(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProto || 'https';
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();

  if (!host) return null;
  return `${protocol}://${host}`;
}

function getAllowedOrigins() {
  return [
    process.env.ALLOWED_ORIGINS,
    process.env.APP_ORIGIN,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isAllowedOrigin(req, origin) {
  if (!origin) return true;

  const requestOrigin = getRequestOrigin(req);
  if (requestOrigin && origin === requestOrigin) {
    return true;
  }

  return getAllowedOrigins().includes(origin);
}

export function applyCors(req, res) {
  const origin = req.headers.origin;
  if (!origin || !isAllowedOrigin(req, origin)) {
    return false;
  }

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return true;
}

export function sendJson(req, res, statusCode, payload) {
  applyCors(req, res);
  res.status(statusCode).json(payload);
}

export function handleOptions(req, res) {
  if (req.method !== 'OPTIONS') return false;
  if (!applyCors(req, res)) {
    res.status(403).end();
    return true;
  }
  res.status(200).end();
  return true;
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  if (req.body && typeof req.body === 'object') return JSON.stringify(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString('utf8');
}
