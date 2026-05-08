import { buildSubscriptionProfileUpdate, normalizeSubscription } from '../../src/utils/subscription.js';
import { PLAN_NAMES, isPaidPlan } from '../../src/data/plans.js';
import { extractTransactionContext } from './paystack.js';
import { getProfileDocument, patchProfileDocument, queryProfilesByField } from './firestore.js';

function addDays(dateValue, days) {
  const date = new Date(dateValue || Date.now());
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function resolveProfile({
  userId = null,
  email = null,
  providerCustomerId = null,
  providerSubscriptionId = null,
} = {}) {
  if (userId) {
    const profile = await getProfileDocument(userId);
    if (profile) return profile;
  }

  const nestedLookups = [
    providerSubscriptionId ? ['subscription.providerSubscriptionId', providerSubscriptionId] : null,
    providerCustomerId ? ['subscription.providerCustomerId', providerCustomerId] : null,
    email ? ['email', email] : null,
  ].filter(Boolean);

  for (const [fieldPath, value] of nestedLookups) {
    const matches = await queryProfilesByField(fieldPath, value);
    if (matches.length > 0) return matches[0];
  }

  return null;
}

function normalizeBillingCycle(value) {
  return value === 'annual' ? 'annual' : 'monthly';
}

export async function applyVerifiedSubscriptionCharge(transaction) {
  const context = extractTransactionContext(transaction);
  const planName = context.planName || PLAN_NAMES.STUDENT;

  if (!isPaidPlan(planName)) {
    throw new Error('Verified Paystack transaction does not map to a paid plan.');
  }

  const profile = await resolveProfile({
    userId: context.userId,
    email: context.email,
    providerCustomerId: transaction.customer?.customer_code || null,
    providerSubscriptionId: transaction.subscription || transaction.subscription_code || null,
  });

  if (!profile?.id) {
    throw new Error('Could not resolve a BOQ Pro profile for the verified transaction.');
  }

  // Bug #8: Idempotency — skip if this exact transaction reference was already applied
  const txRef = transaction.reference || transaction.ref || null;
  if (txRef && profile.subscription?.transactionReference === txRef) {
    return profile;
  }

  const billingCycle = normalizeBillingCycle(context.billingCycle);
  const profileUpdate = buildSubscriptionProfileUpdate({
    planName,
    billingCycle,
    paystackData: {
      transaction,
      billing: billingCycle,
    },
    existingProfile: profile,
    now: transaction.paid_at || transaction.created_at || new Date(),
  });

  const pendingSelection = profile.pendingSubscriptionSelection;
  const shouldClearPending = !pendingSelection
    || pendingSelection.plan === planName
    || pendingSelection.planName === planName;

  return patchProfileDocument(profile.id, {
    ...profileUpdate,
    pendingSubscriptionSelection: shouldClearPending ? null : pendingSelection,
  });
}

export async function syncSubscriptionProfileFromWebhook(eventName, data = {}) {
  if (eventName === 'charge.success') {
    return applyVerifiedSubscriptionCharge(data);
  }

  const profile = await resolveProfile({
    email: data.customer?.email || data.email || null,
    providerCustomerId: data.customer?.customer_code || data.customer_code || null,
    providerSubscriptionId: data.subscription_code || data.subscription || null,
  });

  if (!profile?.id) {
    return null;
  }

  const currentSubscription = normalizeSubscription({
    subscription: profile.subscription,
    fallbackPlan: profile.plan,
    lastPayment: profile.lastPayment,
  });
  const nowIso = new Date().toISOString();

  if (eventName === 'subscription.create') {
    return patchProfileDocument(profile.id, {
      subscription: {
        ...currentSubscription,
        provider: 'paystack',
        providerCustomerId: data.customer?.customer_code || currentSubscription.providerCustomerId,
        providerSubscriptionId: data.subscription_code || currentSubscription.providerSubscriptionId,
        updatedAt: nowIso,
      },
    });
  }

  if (eventName === 'subscription.not_renew') {
    return patchProfileDocument(profile.id, {
      subscription: {
        ...currentSubscription,
        cancelAtPeriodEnd: true,
        updatedAt: nowIso,
      },
    });
  }

  if (eventName === 'subscription.disable') {
    return patchProfileDocument(profile.id, {
      subscription: {
        ...currentSubscription,
        status: 'canceled',
        cancelAtPeriodEnd: false,
        updatedAt: nowIso,
      },
    });
  }

  if (eventName === 'invoice.payment_failed') {
    return patchProfileDocument(profile.id, {
      subscription: {
        ...currentSubscription,
        status: 'grace',
        gracePeriodEnd: addDays(Date.now(), 7),
        updatedAt: nowIso,
      },
    });
  }

  if (eventName === 'invoice.update' && (data?.paid === true || data?.status === 'success')) {
    return patchProfileDocument(profile.id, {
      subscription: {
        ...currentSubscription,
        status: 'active',
        gracePeriodEnd: null,
        updatedAt: nowIso,
      },
    });
  }

  return null;
}
