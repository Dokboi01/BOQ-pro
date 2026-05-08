import {
  PLAN_NAMES,
  getPaystackAmount,
  getPlanByName,
  isPaidPlan,
} from '../data/plans.js';

export const PENDING_SUBSCRIPTION_STORAGE_KEY = 'quantra_pending_subscription';
const LEGACY_PENDING_PAYMENT_STORAGE_KEY = 'quantra_pending_payment';

const ACTIVE_ACCESS_STATUSES = new Set(['active', 'trialing', 'grace', 'free']);

const toIsoString = (value) => {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const addBillingPeriod = (startAt, billingCycle) => {
  const date = new Date(startAt);

  if (billingCycle === 'annual') {
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }

  if (billingCycle === 'monthly') {
    date.setMonth(date.getMonth() + 1);
    return date;
  }

  return null;
};

export const getNormalizedPlanName = (planName) => getPlanByName(planName).label;

export const getSubscriptionEntitlements = (planName) => {
  const plan = getPlanByName(planName);

  return {
    features: Array.isArray(plan.features) ? [...plan.features] : [],
    maxProjects: Number.isFinite(plan.maxProjects) ? plan.maxProjects : null,
    maxUsers: Number.isFinite(plan.maxUsers) ? plan.maxUsers : null,
    unlimitedProjects: !Number.isFinite(plan.maxProjects),
    unlimitedUsers: !Number.isFinite(plan.maxUsers),
    isPaid: isPaidPlan(plan.label),
  };
};

export const getNormalizedBillingCycle = (billingCycle, planName) => {
  const normalizedPlan = getNormalizedPlanName(planName);
  if (!isPaidPlan(normalizedPlan)) return 'free';

  return billingCycle === 'annual' ? 'annual' : 'monthly';
};

export const buildPendingSubscriptionSelection = ({
  planName,
  billingCycle = 'monthly',
  now = new Date(),
} = {}) => ({
  plan: getNormalizedPlanName(planName),
  billingCycle: getNormalizedBillingCycle(billingCycle, planName),
  status: 'awaiting_payment',
  provider: 'paystack',
  updatedAt: toIsoString(now),
});

const buildFreeSubscription = ({ planName = PLAN_NAMES.STUDENT, existingSubscription = null, now = new Date() } = {}) => {
  const plan = getPlanByName(planName);
  const nowIso = toIsoString(now);

  return {
    plan: plan.label,
    planId: plan.id,
    status: 'free',
    provider: 'system',
    billingCycle: 'free',
    currency: 'NGN',
    amountKobo: 0,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    trialEnd: null,
    gracePeriodEnd: null,
    providerCustomerId: null,
    providerSubscriptionId: null,
    transactionReference: null,
    activatedAt: existingSubscription?.activatedAt || nowIso,
    lastPaidAt: null,
    updatedAt: nowIso,
    entitlements: getSubscriptionEntitlements(plan.label),
  };
};

const buildSubscriptionHistoryEntry = ({
  planName,
  billingCycle,
  transactionReference,
  amountKobo,
  provider,
  occurredAt,
}) => ({
  id: `subevt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  type: isPaidPlan(planName) ? 'payment' : 'free-plan',
  plan: planName,
  billingCycle,
  amountKobo,
  provider,
  transactionReference: transactionReference || null,
  status: 'completed',
  occurredAt,
});

export const buildSubscriptionRecord = ({
  planName,
  billingCycle = 'monthly',
  paystackData = null,
  existingSubscription = null,
  now = new Date(),
} = {}) => {
  const normalizedPlan = getNormalizedPlanName(planName);
  const transaction = paystackData?.transaction || paystackData || null;

  if (!isPaidPlan(normalizedPlan)) {
    return buildFreeSubscription({ planName: normalizedPlan, existingSubscription, now });
  }

  const nowIso = toIsoString(now);
  const normalizedBilling = getNormalizedBillingCycle(
    paystackData?.billing || billingCycle,
    normalizedPlan
  );
  const currentPeriodEnd = toIsoString(addBillingPeriod(now, normalizedBilling));

  return {
    plan: normalizedPlan,
    planId: getPlanByName(normalizedPlan).id,
    status: 'active',
    provider: transaction ? 'paystack' : 'manual',
    billingCycle: normalizedBilling,
    currency: 'NGN',
    amountKobo: getPaystackAmount(normalizedPlan, normalizedBilling),
    currentPeriodStart: nowIso,
    currentPeriodEnd,
    cancelAtPeriodEnd: false,
    trialEnd: null,
    gracePeriodEnd: null,
    providerCustomerId:
      transaction?.customer_code ||
      transaction?.customer?.customer_code ||
      existingSubscription?.providerCustomerId ||
      null,
    providerSubscriptionId:
      transaction?.subscription ||
      transaction?.subscription_code ||
      existingSubscription?.providerSubscriptionId ||
      null,
    transactionReference:
      transaction?.reference ||
      transaction?.ref ||
      existingSubscription?.transactionReference ||
      null,
    activatedAt: existingSubscription?.activatedAt || nowIso,
    lastPaidAt: nowIso,
    updatedAt: nowIso,
    entitlements: getSubscriptionEntitlements(normalizedPlan),
  };
};

export const normalizeSubscription = ({
  subscription = null,
  fallbackPlan = PLAN_NAMES.STUDENT,
  lastPayment = null,
} = {}) => {
  const normalizedPlan = getNormalizedPlanName(subscription?.plan || fallbackPlan);
  const paidPlan = isPaidPlan(normalizedPlan);

  if (!subscription || typeof subscription !== 'object') {
    if (!paidPlan) {
      return buildFreeSubscription({ planName: normalizedPlan });
    }

    if (lastPayment) {
      return buildSubscriptionRecord({
        planName: normalizedPlan,
        billingCycle: lastPayment.billing,
        paystackData: { transaction: { reference: lastPayment.reference }, billing: lastPayment.billing },
        now: lastPayment.date || new Date(),
      });
    }

    return buildSubscriptionRecord({ planName: normalizedPlan });
  }

  if (!paidPlan) {
    return {
      ...buildFreeSubscription({ planName: normalizedPlan, existingSubscription: subscription }),
      ...subscription,
      plan: normalizedPlan,
      planId: getPlanByName(normalizedPlan).id,
      status: 'free',
      billingCycle: 'free',
      amountKobo: 0,
      provider: subscription.provider || 'system',
      entitlements: getSubscriptionEntitlements(normalizedPlan),
    };
  }

  const normalizedBilling = getNormalizedBillingCycle(subscription.billingCycle || lastPayment?.billing, normalizedPlan);

  return {
    plan: normalizedPlan,
    planId: getPlanByName(normalizedPlan).id,
    status: subscription.status || 'active',
    provider: subscription.provider || 'manual',
    billingCycle: normalizedBilling,
    currency: subscription.currency || 'NGN',
    amountKobo: Number.isFinite(subscription.amountKobo)
      ? subscription.amountKobo
      : getPaystackAmount(normalizedPlan, normalizedBilling),
    currentPeriodStart: toIsoString(subscription.currentPeriodStart) || toIsoString(lastPayment?.date),
    currentPeriodEnd:
      toIsoString(subscription.currentPeriodEnd) ||
      toIsoString(
        addBillingPeriod(
          subscription.currentPeriodStart || lastPayment?.date || new Date(),
          normalizedBilling
        )
      ),
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd === true,
    trialEnd: toIsoString(subscription.trialEnd),
    gracePeriodEnd: toIsoString(subscription.gracePeriodEnd),
    providerCustomerId: subscription.providerCustomerId || null,
    providerSubscriptionId: subscription.providerSubscriptionId || null,
    transactionReference:
      subscription.transactionReference ||
      lastPayment?.reference ||
      null,
    activatedAt: toIsoString(subscription.activatedAt) || toIsoString(subscription.currentPeriodStart) || toIsoString(new Date()),
    lastPaidAt: toIsoString(subscription.lastPaidAt) || toIsoString(lastPayment?.date),
    updatedAt: toIsoString(subscription.updatedAt) || toIsoString(new Date()),
    entitlements: getSubscriptionEntitlements(normalizedPlan),
  };
};

export const getAccessPlanName = (profileLike) => {
  const subscription = normalizeSubscription({
    subscription: profileLike?.subscription,
    fallbackPlan: profileLike?.plan,
    lastPayment: profileLike?.lastPayment,
  });

  if (ACTIVE_ACCESS_STATUSES.has(subscription.status)) {
    return subscription.plan;
  }

  return PLAN_NAMES.STUDENT;
};

export const isFreeAccessPlan = (profileLike) => !isPaidPlan(getAccessPlanName(profileLike));

export const getSubscriptionSnapshot = (profileLike) => {
  const subscription = normalizeSubscription({
    subscription: profileLike?.subscription,
    fallbackPlan: profileLike?.plan,
    lastPayment: profileLike?.lastPayment,
  });
  const accessPlan = getAccessPlanName(profileLike);

  return {
    planName: accessPlan,
    isFreePlan: !isPaidPlan(accessPlan),
    status: subscription.status,
    billingCycle: subscription.billingCycle,
    amountKobo: subscription.amountKobo,
    renewalAt: subscription.currentPeriodEnd,
    subscription,
  };
};

export const normalizeUserProfile = (profileLike = {}) => {
  const normalizedPlan = getAccessPlanName(profileLike);
  const subscription = normalizeSubscription({
    subscription: profileLike?.subscription,
    fallbackPlan: profileLike?.plan || normalizedPlan,
    lastPayment: profileLike?.lastPayment,
  });

  return {
    ...profileLike,
    plan: normalizedPlan,
    subscription,
    lastPayment: profileLike?.lastPayment || (
      subscription.transactionReference
        ? {
            reference: subscription.transactionReference,
            billing: subscription.billingCycle,
            plan: subscription.plan,
            date: subscription.lastPaidAt || subscription.updatedAt,
          }
        : null
    ),
  };
};

export const buildSubscriptionProfileUpdate = ({
  planName,
  billingCycle = 'monthly',
  paystackData = null,
  existingProfile = null,
  now = new Date(),
} = {}) => {
  const normalizedPlan = getNormalizedPlanName(planName);
  const nextSubscription = buildSubscriptionRecord({
    planName: normalizedPlan,
    billingCycle,
    paystackData,
    existingSubscription: existingProfile?.subscription,
    now,
  });

  const transactionReference = nextSubscription.transactionReference;
  const lastPayment = isPaidPlan(normalizedPlan)
    ? {
        reference: transactionReference,
        billing: nextSubscription.billingCycle,
        plan: normalizedPlan,
        date: nextSubscription.lastPaidAt || toIsoString(now),
      }
    : null;

  const previousHistory = Array.isArray(existingProfile?.subscriptionHistory)
    ? existingProfile.subscriptionHistory
    : [];
  const historyEntry = buildSubscriptionHistoryEntry({
    planName: normalizedPlan,
    billingCycle: nextSubscription.billingCycle,
    transactionReference,
    amountKobo: nextSubscription.amountKobo,
    provider: nextSubscription.provider,
    occurredAt: nextSubscription.updatedAt,
  });

  return {
    plan: normalizedPlan,
    subscription: nextSubscription,
    lastPayment,
    subscriptionHistory: [...previousHistory, historyEntry].slice(-25),
  };
};

export const savePendingSubscription = ({ planName, billing = 'monthly', paystackData = null } = {}) => {
  if (typeof window === 'undefined') return;

  const payload = {
    plan: getNormalizedPlanName(planName),
    billing: getNormalizedBillingCycle(billing, planName),
    paystackData: paystackData || null,
    storedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(PENDING_SUBSCRIPTION_STORAGE_KEY, JSON.stringify(payload));
};

export const readPendingSubscription = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(PENDING_SUBSCRIPTION_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed?.plan) return null;
      return {
        plan: getNormalizedPlanName(parsed.plan),
        billing: getNormalizedBillingCycle(parsed.billing, parsed.plan),
        paystackData: parsed.paystackData || null,
        storedAt: parsed.storedAt || null,
      };
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_PENDING_PAYMENT_STORAGE_KEY);
    if (!legacyRaw) return null;

    const legacyPayment = JSON.parse(legacyRaw);
    return {
      plan: null,
      billing: legacyPayment?.billing || 'monthly',
      paystackData: legacyPayment,
      storedAt: null,
    };
  } catch (error) {
    console.warn('Failed to read pending subscription:', error.message);
    return null;
  }
};

export const clearPendingSubscription = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PENDING_SUBSCRIPTION_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_PENDING_PAYMENT_STORAGE_KEY);
};
