/* global process */
import { createHmac } from 'node:crypto';
import { getPaystackAmount, getPaystackCheckoutSupport, isPaidPlan, PLAN_NAMES } from '../../src/data/plans.js';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

const PAYSTACK_PLAN_ENV_MAP = {
  Starter: {
    monthly: 'PAYSTACK_PLAN_CODE_STARTER_MONTHLY',
    annual: 'PAYSTACK_PLAN_CODE_STARTER_ANNUAL',
  },
  Professional: {
    monthly: 'PAYSTACK_PLAN_CODE_PROFESSIONAL_MONTHLY',
    annual: 'PAYSTACK_PLAN_CODE_PROFESSIONAL_ANNUAL',
  },
  Business: {
    monthly: 'PAYSTACK_PLAN_CODE_BUSINESS_MONTHLY',
    annual: 'PAYSTACK_PLAN_CODE_BUSINESS_ANNUAL',
  },
  Corporate: {
    monthly: 'PAYSTACK_PLAN_CODE_CORPORATE_MONTHLY',
    annual: 'PAYSTACK_PLAN_CODE_CORPORATE_ANNUAL',
  },
};

export function getPaystackSecretKey() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured.');
  }
  return secretKey;
}

export function getPaystackPlanCode(planName, billingCycle) {
  return process.env[PAYSTACK_PLAN_ENV_MAP?.[planName]?.[billingCycle] || ''] || null;
}

export function assertSupportedPaidPlan(planName) {
  if (!isPaidPlan(planName)) {
    throw new Error(`The ${planName || PLAN_NAMES.STUDENT} plan does not require Paystack checkout.`);
  }
  if (planName === PLAN_NAMES.ENTERPRISE) {
    throw new Error('Enterprise plans are handled offline and cannot be checked out through Paystack.');
  }
}

function normalizeMetadata(input) {
  if (!input) return {};
  if (typeof input === 'string') {
    try {
      return JSON.parse(input);
    } catch {
      return {};
    }
  }

  const customFields = Array.isArray(input.custom_fields)
    ? Object.fromEntries(
        input.custom_fields
          .map((entry) => [entry.variable_name, entry.value])
          .filter(([key]) => Boolean(key))
      )
    : {};

  return {
    ...input,
    ...customFields,
  };
}

export function extractTransactionContext(transaction = {}) {
  const metadata = normalizeMetadata(transaction.metadata);
  return {
    metadata,
    planName: metadata.planName || metadata.plan_name || null,
    billingCycle: metadata.billingCycle || metadata.billing_period || metadata.billing || 'monthly',
    userId: metadata.userId || metadata.firebase_uid || metadata.uid || null,
    email: metadata.email || transaction.customer?.email || transaction.customer?.customer_email || null,
    recurringConfigured: metadata.recurringConfigured === true || metadata.recurringConfigured === 'true',
  };
}

async function paystackRequest(path, options = {}) {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const payload = await response.json();
  if (!response.ok || payload?.status === false) {
    throw new Error(payload?.message || payload?.error || `Paystack request failed for ${path}.`);
  }

  return payload;
}

export async function initializeSubscriptionTransaction({
  planName,
  billingCycle,
  email,
  userId,
  callbackUrl,
  origin,
}) {
  assertSupportedPaidPlan(planName);

  const reference = `boqpro_${planName.toLowerCase().replace(/\s+/g, '_')}_${billingCycle}_${Date.now()}`;
  const recurringPlanCode = getPaystackPlanCode(planName, billingCycle);
  const expectedAmount = getPaystackAmount(planName, billingCycle);
  const checkoutSupport = getPaystackCheckoutSupport(planName, billingCycle);

  if (!checkoutSupport.supported) {
    const error = new Error(checkoutSupport.reason || 'This BOQ Pro plan cannot be checked out through Paystack right now.');
    error.status = 400;
    throw error;
  }

  const metadata = {
    product: 'BOQ Pro',
    purpose: 'subscription',
    planName,
    billingCycle,
    userId,
    email,
    recurringConfigured: Boolean(recurringPlanCode),
    initializedAt: new Date().toISOString(),
  };

  const payload = {
    email,
    reference,
    currency: 'NGN',
    callback_url: callbackUrl || (origin ? `${origin}/?paystack=return` : undefined),
    metadata: JSON.stringify(metadata),
  };

  if (recurringPlanCode) {
    payload.plan = recurringPlanCode;
  } else {
    payload.amount = String(expectedAmount);
  }

  const response = await paystackRequest('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    reference,
    accessCode: response.data.access_code,
    authorizationUrl: response.data.authorization_url,
    recurringConfigured: Boolean(recurringPlanCode),
    expectedAmount,
  };
}

export async function verifySubscriptionTransaction(reference) {
  const response = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const transaction = response.data;
  const context = extractTransactionContext(transaction);
  return {
    transaction,
    context,
    expectedAmount: context.planName ? getPaystackAmount(context.planName, context.billingCycle) : null,
  };
}

export function verifyPaystackWebhookSignature(rawBody, signature) {
  if (!signature) return false;

  const expected = createHmac('sha512', getPaystackSecretKey())
    .update(rawBody)
    .digest('hex');

  return expected === signature;
}
