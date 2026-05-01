/**
 * BOQ Pro — Plan Definitions & Feature Gating
 *
 * 6-tier pricing structure with Paystack integration metadata.
 * Amounts stored in kobo (NGN subunit) for Paystack. Display prices in Naira.
 */

export const PLAN_NAMES = {
    STUDENT: 'Student',
    STARTER: 'Starter',
    PROFESSIONAL: 'Professional',
    BUSINESS: 'Business',
    CORPORATE: 'Corporate',
    ENTERPRISE: 'Enterprise'
};

/**
 * Full plan configuration.
 * – `priceMonthly` / `priceAnnual` are in **kobo** (÷100 for Naira display).
 * – `displayMonthly` / `displayAnnual` are user-facing formatted strings.
 * – `features` is the list of feature keys the plan unlocks.
 * – `maxProjects` controls per-plan project hard limits.
 * – `maxUsers` controls team seat limits.
 */
export const PLANS = {
    [PLAN_NAMES.STUDENT]: {
        id: 'student',
        label: 'Student',
        tagline: 'Learn the workflow',
        description: 'A clean entry point for students and early-stage practitioners who need structured BOQ workflow without a monthly cost.',
        priceMonthly: 0,
        priceAnnual: 0,
        displayMonthly: 'Free',
        displayAnnual: 'Free',
        maxProjects: 3,
        maxUsers: 1,
        features: [
            'basic-boq',
            'pdf-export',
            'community-support',
            'basic-rate-buildup',
            'essential-library'
        ],
        featureLabels: [
            'Up to 3 active projects',
            'Core BOQ calculations',
            'Standard PDF exports',
            'Essential material library',
            'Basic rate build-up support',
            'Community support'
        ],
        popular: false,
        cta: 'Start Free'
    },

    [PLAN_NAMES.STARTER]: {
        id: 'starter',
        label: 'Starter',
        tagline: 'For freelance QS & small contractors',
        description: 'Everything a solo practitioner needs to take on real jobs — more projects, better exports, and full material library access.',
        priceMonthly: 500000,       // ₦5,000
        priceAnnual: 5000000,       // ₦50,000 (save ₦10,000/yr)
        displayMonthly: '₦5,000',
        displayAnnual: '₦50,000',
        maxProjects: 10,
        maxUsers: 1,
        features: [
            'basic-boq',
            'pdf-export',
            'csv-export',
            'community-support',
            'basic-rate-buildup',
            'essential-library',
            'full-library',
            'email-support'
        ],
        featureLabels: [
            'Up to 10 active projects',
            'PDF + CSV exports',
            'Full material library',
            'Standard rate analysis',
            'Email support',
            'Project notes & attachments'
        ],
        popular: false,
        cta: 'Get Started'
    },

    [PLAN_NAMES.PROFESSIONAL]: {
        id: 'professional',
        label: 'Professional',
        tagline: 'For active QS teams & estimators',
        description: 'The strongest option for real project delivery — custom pricing, advanced reports, and the day-to-day workflow of commercial teams.',
        priceMonthly: 1500000,      // ₦15,000
        priceAnnual: 15000000,      // ₦150,000 (save ₦30,000/yr)
        displayMonthly: '₦15,000',
        displayAnnual: '₦150,000',
        maxProjects: Infinity,
        maxUsers: 1,
        features: [
            'basic-boq',
            'pdf-export',
            'csv-export',
            'community-support',
            'basic-rate-buildup',
            'essential-library',
            'full-library',
            'email-support',
            'material-intelligence',
            'advanced-analysis',
            'custom-pricing',
            'priority-support',
            'ai-analysis',
            'drawing-analysis'
        ],
        featureLabels: [
            'Unlimited projects',
            'Benchmark + custom pricing studio',
            'Professional PDF & CSV exports',
            'Advanced rate analysis & AI insights',
            'Drawing analysis (AI-powered)',
            'Custom material libraries',
            'Priority support'
        ],
        popular: true,
        cta: 'Choose Professional'
    },

    [PLAN_NAMES.BUSINESS]: {
        id: 'business',
        label: 'Business',
        tagline: 'For small-medium firms',
        description: 'Bring your whole team into one workspace — shared libraries, review workflows, and consolidated reporting for growing firms.',
        priceMonthly: 3500000,      // ₦35,000
        priceAnnual: 35000000,      // ₦350,000 (save ₦70,000/yr)
        displayMonthly: '₦35,000',
        displayAnnual: '₦350,000',
        maxProjects: Infinity,
        maxUsers: 5,
        features: [
            'basic-boq',
            'pdf-export',
            'csv-export',
            'community-support',
            'basic-rate-buildup',
            'essential-library',
            'full-library',
            'email-support',
            'material-intelligence',
            'advanced-analysis',
            'custom-pricing',
            'priority-support',
            'ai-analysis',
            'drawing-analysis',
            'team-workspace',
            'shared-library',
            'review-flow',
            'bid-management'
        ],
        featureLabels: [
            'Everything in Professional',
            'Up to 5 team members',
            'Shared company workspace',
            'Team review & approval flow',
            'Shared material libraries',
            'Bid management tools',
            'Consolidated reporting'
        ],
        popular: false,
        cta: 'Choose Business'
    },

    [PLAN_NAMES.CORPORATE]: {
        id: 'corporate',
        label: 'Corporate',
        tagline: 'For large firms & institutions',
        description: 'Full-scale deployment with admin controls, audit trails, and dedicated support for organizations that need compliance-grade tools.',
        priceMonthly: 7500000,      // ₦75,000
        priceAnnual: 75000000,      // ₦750,000 (save ₦150,000/yr)
        displayMonthly: '₦75,000',
        displayAnnual: '₦750,000',
        maxProjects: Infinity,
        maxUsers: 20,
        features: [
            'basic-boq',
            'pdf-export',
            'csv-export',
            'community-support',
            'basic-rate-buildup',
            'essential-library',
            'full-library',
            'email-support',
            'material-intelligence',
            'advanced-analysis',
            'custom-pricing',
            'priority-support',
            'ai-analysis',
            'drawing-analysis',
            'team-workspace',
            'shared-library',
            'review-flow',
            'bid-management',
            'admin-controls',
            'audit-trail',
            'sso',
            'dedicated-support',
            'api-access'
        ],
        featureLabels: [
            'Everything in Business',
            'Up to 20 team members',
            'Admin controls & permissions',
            'Audit trail & activity log',
            'SSO / single sign-on ready',
            'API access',
            'Dedicated account manager'
        ],
        popular: false,
        cta: 'Choose Corporate'
    },

    [PLAN_NAMES.ENTERPRISE]: {
        id: 'enterprise',
        label: 'Enterprise',
        tagline: 'Institutional rollout',
        description: 'For firms that want BOQ Pro deployed as a company system with fully managed onboarding, SLA, and unlimited scale.',
        priceMonthly: null,
        priceAnnual: null,
        displayMonthly: 'Custom',
        displayAnnual: 'Custom',
        maxProjects: Infinity,
        maxUsers: Infinity,
        features: ['all'],
        featureLabels: [
            'Everything in Corporate',
            'Unlimited team members',
            'Custom integrations',
            'Managed onboarding & training',
            'SLA & uptime guarantee',
            'White-label option',
            'Dedicated infrastructure'
        ],
        popular: false,
        cta: 'Talk to Sales',
        contactEmail: 'adedokunhassan01@gmail.com',
        contactPhone: '08151148095'
    }
};

// ── Legacy aliases (for backward compat with existing code) ──
export const PLAN_LIMITS = Object.fromEntries(
    Object.entries(PLANS).map(([name, plan]) => [
        name,
        {
            maxProjects: plan.maxProjects,
            features: plan.features,
            label: plan.label,
            price: plan.displayMonthly
        }
    ])
);

// ── Helper: check if a user's plan includes a feature ──
export const hasFeature = (userPlan, feature) => {
    const plan = PLANS[userPlan] || PLANS[PLAN_NAMES.STUDENT];
    if (plan.features.includes('all')) return true;
    return plan.features.includes(feature);
};

// ── Helper: get plan config by name (fuzzy-matches legacy names) ──
export const getPlanByName = (name) => {
    if (!name) return PLANS[PLAN_NAMES.STUDENT];
    // Direct match
    if (PLANS[name]) return PLANS[name];
    // Legacy name mapping
    const normalized = name.toLowerCase().trim();
    if (normalized === 'free' || normalized === 'student & basic') return PLANS[PLAN_NAMES.STUDENT];
    if (normalized === 'practitioner') return PLANS[PLAN_NAMES.PROFESSIONAL];
    // Search by id
    const byId = Object.values(PLANS).find(p => p.id === normalized);
    if (byId) return byId;
    return PLANS[PLAN_NAMES.STUDENT];
};

// ── Helper: get Paystack amount in kobo for a plan ──
export const getPaystackAmount = (planName, billing = 'monthly') => {
    const plan = getPlanByName(planName);
    if (!plan || plan.priceMonthly === 0 || plan.priceMonthly === null) return 0;
    return billing === 'annual' ? plan.priceAnnual : plan.priceMonthly;
};

// ── Feature comparison matrix for the pricing page ──
export const FEATURE_COMPARISON = [
    { feature: 'Active projects', student: '3', starter: '10', professional: 'Unlimited', business: 'Unlimited', corporate: 'Unlimited', enterprise: 'Unlimited' },
    { feature: 'Team members', student: '1', starter: '1', professional: '1', business: '5', corporate: '20', enterprise: 'Unlimited' },
    { feature: 'PDF export', student: true, starter: true, professional: true, business: true, corporate: true, enterprise: true },
    { feature: 'CSV export', student: false, starter: true, professional: true, business: true, corporate: true, enterprise: true },
    { feature: 'Material library', student: 'Basic', starter: 'Full', professional: 'Full + Custom', business: 'Full + Custom', corporate: 'Full + Custom', enterprise: 'Full + Custom' },
    { feature: 'Custom pricing studio', student: false, starter: false, professional: true, business: true, corporate: true, enterprise: true },
    { feature: 'AI rate analysis', student: false, starter: false, professional: true, business: true, corporate: true, enterprise: true },
    { feature: 'Drawing analysis (AI)', student: false, starter: false, professional: true, business: true, corporate: true, enterprise: true },
    { feature: 'Team workspace', student: false, starter: false, professional: false, business: true, corporate: true, enterprise: true },
    { feature: 'Review & approval flow', student: false, starter: false, professional: false, business: true, corporate: true, enterprise: true },
    { feature: 'Admin controls', student: false, starter: false, professional: false, business: false, corporate: true, enterprise: true },
    { feature: 'SSO / single sign-on', student: false, starter: false, professional: false, business: false, corporate: true, enterprise: true },
    { feature: 'API access', student: false, starter: false, professional: false, business: false, corporate: true, enterprise: true },
    { feature: 'Dedicated support', student: false, starter: false, professional: false, business: false, corporate: true, enterprise: true },
    { feature: 'SLA guarantee', student: false, starter: false, professional: false, business: false, corporate: false, enterprise: true },
    { feature: 'Custom integrations', student: false, starter: false, professional: false, business: false, corporate: false, enterprise: true },
];

// ── All plan names in tier order (for upgrade comparisons) ──
export const PLAN_TIER_ORDER = [
    PLAN_NAMES.STUDENT,
    PLAN_NAMES.STARTER,
    PLAN_NAMES.PROFESSIONAL,
    PLAN_NAMES.BUSINESS,
    PLAN_NAMES.CORPORATE,
    PLAN_NAMES.ENTERPRISE
];

export const PAYSTACK_MAX_TRANSACTION_KOBO = 10000000;

export const isPaidPlan = (planName) => {
    const plan = getPlanByName(planName);
    return plan && plan.priceMonthly !== null && plan.priceMonthly > 0;
};

const formatKoboToNaira = (amountKobo) => `₦${(Number(amountKobo || 0) / 100).toLocaleString()}`;

export const getPaystackCheckoutSupport = (planName, billing = 'monthly') => {
    const plan = getPlanByName(planName);
    const normalizedBilling = billing === 'annual' ? 'annual' : 'monthly';

    if (!plan || !isPaidPlan(plan.label)) {
        return {
            supported: false,
            reason: `The ${plan?.label || PLAN_NAMES.STUDENT} plan does not require Paystack checkout.`,
            amountKobo: 0,
            maxAmountKobo: PAYSTACK_MAX_TRANSACTION_KOBO,
        };
    }

    if (plan.label === PLAN_NAMES.ENTERPRISE) {
        return {
            supported: false,
            reason: 'Enterprise plans are handled offline and are not processed through Paystack checkout.',
            amountKobo: null,
            maxAmountKobo: PAYSTACK_MAX_TRANSACTION_KOBO,
        };
    }

    const amountKobo = getPaystackAmount(plan.label, normalizedBilling);

    if (amountKobo > PAYSTACK_MAX_TRANSACTION_KOBO) {
        return {
            supported: false,
            reason: `${plan.label} ${normalizedBilling} checkout exceeds the Paystack online charge limit of ${formatKoboToNaira(PAYSTACK_MAX_TRANSACTION_KOBO)}. Choose monthly billing or process this plan offline.`,
            amountKobo,
            maxAmountKobo: PAYSTACK_MAX_TRANSACTION_KOBO,
        };
    }

    return {
        supported: true,
        reason: null,
        amountKobo,
        maxAmountKobo: PAYSTACK_MAX_TRANSACTION_KOBO,
    };
};

export const isUpgrade = (currentPlan, targetPlan) => {
    const currentIndex = PLAN_TIER_ORDER.indexOf(currentPlan);
    const targetIndex = PLAN_TIER_ORDER.indexOf(targetPlan);
    if (currentIndex === -1 || targetIndex === -1) return false;
    return targetIndex > currentIndex;
};
