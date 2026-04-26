/* global Buffer, process */

import { createSign } from 'node:crypto';

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

let cachedAccessToken = null;
let cachedAccessTokenExpiry = 0;

const SERVICE_ACCOUNT_EMAIL_KEYS = [
  'FIREBASE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_CLIENT_EMAIL',
];

const SERVICE_ACCOUNT_PRIVATE_KEY_KEYS = [
  'FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'GOOGLE_PRIVATE_KEY',
];

function getEnv(keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return null;
}

function getServiceAccountConfig() {
  const clientEmail = getEnv(SERVICE_ACCOUNT_EMAIL_KEYS);
  const rawPrivateKey = getEnv(SERVICE_ACCOUNT_PRIVATE_KEY_KEYS);
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'boq-pro-72332';

  if (!clientEmail || !rawPrivateKey) {
    return null;
  }

  return {
    clientEmail,
    privateKey: rawPrivateKey.replace(/\\n/g, '\n'),
    projectId,
  };
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createJwtAssertion({ clientEmail, privateKey }) {
  const now = Math.floor(Date.now() / 1000);

  const header = base64UrlEncode(JSON.stringify({
    alg: 'RS256',
    typ: 'JWT',
  }));
  const payload = base64UrlEncode(JSON.stringify({
    iss: clientEmail,
    sub: clientEmail,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/datastore',
  }));

  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  signer.end();

  const signature = signer
    .sign(privateKey)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${header}.${payload}.${signature}`;
}

async function getFirestoreAccessToken() {
  if (cachedAccessToken && Date.now() < cachedAccessTokenExpiry) {
    return cachedAccessToken;
  }

  const config = getServiceAccountConfig();
  if (!config) {
    throw new Error('Firestore service account is not configured. Add FIREBASE_SERVICE_ACCOUNT_EMAIL and FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY.');
  }

  const assertion = createJwtAssertion(config);
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.access_token) {
    throw new Error(payload?.error_description || payload?.error || 'Failed to obtain Firestore access token.');
  }

  cachedAccessToken = payload.access_token;
  cachedAccessTokenExpiry = Date.now() + Math.max((payload.expires_in - 60) * 1000, 60_000);
  return cachedAccessToken;
}

function getFirestoreDocumentUrl(path) {
  const config = getServiceAccountConfig();
  if (!config) {
    throw new Error('Firestore service account is not configured.');
  }

  const trimmedPath = String(path || '').replace(/^\/+/, '');
  return `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/${trimmedPath}`;
}

function toFirestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((entry) => toFirestoreValue(entry)),
      },
    };
  }
  if (value instanceof Date) {
    return { timestampValue: value.toISOString() };
  }
  switch (typeof value) {
    case 'string':
      return { stringValue: value };
    case 'boolean':
      return { booleanValue: value };
    case 'number':
      if (Number.isInteger(value)) {
        return { integerValue: String(value) };
      }
      return { doubleValue: value };
    case 'object':
      return {
        mapValue: {
          fields: Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [key, toFirestoreValue(entry)])
          ),
        },
      };
    default:
      return { stringValue: String(value) };
  }
}

function fromFirestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('arrayValue' in value) {
    return (value.arrayValue?.values || []).map((entry) => fromFirestoreValue(entry));
  }
  if ('mapValue' in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue?.fields || {}).map(([key, entry]) => [key, fromFirestoreValue(entry)])
    );
  }
  return null;
}

function fromFirestoreDocument(document) {
  if (!document) return null;

  const name = String(document.name || '');
  const id = name.split('/').pop();
  return {
    id,
    ...Object.fromEntries(
      Object.entries(document.fields || {}).map(([key, value]) => [key, fromFirestoreValue(value)])
    ),
  };
}

export async function getProfileDocument(profileId) {
  const token = await getFirestoreAccessToken();
  const response = await fetch(getFirestoreDocumentUrl(`profiles/${profileId}`), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) return null;

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Failed to read profile document.');
  }

  return fromFirestoreDocument(payload);
}

export async function patchProfileDocument(profileId, updates = {}) {
  const token = await getFirestoreAccessToken();
  const serializedUpdates = {
    ...updates,
    updated_at: updates.updated_at || new Date().toISOString(),
  };
  const updateMaskFields = Object.keys(serializedUpdates);
  const url = new URL(getFirestoreDocumentUrl(`profiles/${profileId}`));
  updateMaskFields.forEach((fieldPath) => {
    url.searchParams.append('updateMask.fieldPaths', fieldPath);
  });

  const response = await fetch(url.toString(), {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(serializedUpdates).map(([key, value]) => [key, toFirestoreValue(value)])
      ),
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Failed to update profile document.');
  }

  return fromFirestoreDocument(payload);
}

export async function queryProfilesByField(fieldPath, expectedValue) {
  const token = await getFirestoreAccessToken();
  const config = getServiceAccountConfig();
  if (!config) {
    throw new Error('Firestore service account is not configured.');
  }

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'profiles' }],
          limit: 5,
          where: {
            fieldFilter: {
              field: { fieldPath },
              op: 'EQUAL',
              value: toFirestoreValue(expectedValue),
            },
          },
        },
      }),
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Failed to query profile document.');
  }

  return payload
    .map((entry) => fromFirestoreDocument(entry.document))
    .filter(Boolean);
}
