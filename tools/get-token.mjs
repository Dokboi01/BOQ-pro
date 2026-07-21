/**
 * Get a Firebase access token from the service account
 * Run: node --env-file=.env get-token.mjs
 */

const privateKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
  ? process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
  : null;

const clientEmail = "firebase-adminsdk-fbsvc@boq-pro-72332.iam.gserviceaccount.com";

const header = { alg: 'RS256', typ: 'JWT' };
const now = Math.floor(Date.now() / 1000);
const payload = {
  iss: clientEmail,
  scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/datastore',
  aud: 'https://oauth2.googleapis.com/token',
  exp: now + 3600,
  iat: now,
};

const base64url = (obj) => {
  const json = JSON.stringify(obj);
  const base64 = Buffer.from(json).toString('base64');
  return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const headerEncoded = base64url(header);
const payloadEncoded = base64url(payload);
const signatureInput = `${headerEncoded}.${payloadEncoded}`;

const crypto = await import('crypto');
const sign = crypto.createSign('RSA-SHA256');
sign.update(signatureInput);
const signature = sign.sign(privateKey, 'base64');
const signatureEncoded = signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const jwt = `${signatureInput}.${signatureEncoded}`;

const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  }),
});

const data = await response.json();
console.log(data.access_token);
