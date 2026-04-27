/**
 * BOQ Pro — Deploy Firestore Security Rules & Composite Index
 * 
 * Uses the Firebase service account to authenticate and deploy:
 * 1. Security rules to Firestore
 * 2. Composite index for projects collection
 * 
 * Run with: node --env-file=.env deploy-firestore.mjs
 */

import { readFileSync } from 'fs';

const PROJECT_ID = 'boq-pro-72332';
const privateKey = process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n');
const clientEmail = 'firebase-adminsdk-fbsvc@boq-pro-72332.iam.gserviceaccount.com';

async function getAccessToken() {
  const crypto = await import('crypto');
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/datastore',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const sigInput = b64(header) + '.' + b64(payload);
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(sigInput);
  const sig = sign.sign(privateKey, 'base64url');
  const jwt = sigInput + '.' + sig;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error('Token failed: ' + JSON.stringify(d));
  return d.access_token;
}

async function deployRules(accessToken) {
  console.log('\n📜 Deploying Firestore security rules...');
  
  const rulesContent = readFileSync('firestore.rules', 'utf-8');

  // Step 1: Create the ruleset
  console.log('   Creating ruleset...');
  const rulesetResponse = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/rulesets`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: {
          files: [{ name: "firestore.rules", content: rulesContent }],
        },
      }),
    }
  );

  if (!rulesetResponse.ok) {
    const errText = await rulesetResponse.text();
    console.error(`❌ Failed to create ruleset: ${errText}`);
    return false;
  }

  const rulesetData = await rulesetResponse.json();
  const rulesetName = rulesetData.name;
  console.log(`   ✅ Ruleset created: ${rulesetName}`);

  // Step 2: Release the ruleset using UpdateReleaseRequest format
  console.log('   Releasing ruleset...');
  
  const releaseResponse = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${PROJECT_ID}/releases/cloud.firestore`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        release: {
          name: `projects/${PROJECT_ID}/releases/cloud.firestore`,
          rulesetName: rulesetName,
        },
        updateMask: 'rulesetName',
      }),
    }
  );

  if (releaseResponse.ok) {
    const releaseData = await releaseResponse.json();
    console.log(`   ✅ Rules released! Updated: ${releaseData.updateTime}`);
    return true;
  }

  const errText = await releaseResponse.text();
  console.error(`❌ Failed to release rules (${releaseResponse.status}): ${errText.substring(0, 300)}`);
  console.log('\n⚠️  The service account needs the "Firebase Rules Admin" IAM role.');
  console.log('   Grant it at: https://console.cloud.google.com/iam-admin/iam?project=' + PROJECT_ID);
  return false;
}

async function createCompositeIndex(accessToken) {
  console.log('\n🔍 Creating composite index for projects collection...');
  console.log('   Fields: user_id (ASC), created_at (DESC)');
  
  const indexBody = {
    fields: [
      { fieldPath: 'user_id', order: 'ASCENDING' },
      { fieldPath: 'created_at', order: 'DESCENDING' },
    ],
    queryScope: 'COLLECTION',
  };

  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/collectionGroups/projects/indexes`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(indexBody),
    }
  );

  if (response.ok) {
    const data = await response.json();
    console.log(`✅ Composite index created! Operation: ${data.name}`);
    console.log('   ⏳ Index will be ready in a few minutes (Firestore builds it asynchronously)');
    return true;
  } else {
    const errText = await response.text();
    if (response.status === 409) {
      console.log('ℹ️  Composite index already exists (or is being created)');
      return true;
    }
    console.error(`❌ Failed to create index (${response.status}): ${errText.substring(0, 300)}`);
    console.log('\n⚠️  The service account needs the "Cloud Datastore Index Admin" IAM role.');
    console.log('   Grant it at: https://console.cloud.google.com/iam-admin/iam?project=' + PROJECT_ID);
    return false;
  }
}

async function main() {
  console.log('🚀 BOQ Pro — Deploying Firestore configuration\n');

  console.log('🔑 Getting access token from service account...');
  let accessToken;
  try {
    accessToken = await getAccessToken();
    console.log('✅ Access token obtained\n');
  } catch (err) {
    console.error(`❌ Failed to get access token: ${err.message}`);
    process.exit(1);
  }

  const rulesOk = await deployRules(accessToken);
  const indexOk = await createCompositeIndex(accessToken);

  console.log('\n' + '='.repeat(50));
  if (rulesOk && indexOk) {
    console.log('🎉 Firestore configuration deployed successfully!');
  } else {
    console.log('⚠️  Some operations had issues. Check the logs above.');
  }
  console.log('='.repeat(50));
}

main().catch((err) => {
  console.error('❌ Deployment failed:', err);
  process.exit(1);
});
