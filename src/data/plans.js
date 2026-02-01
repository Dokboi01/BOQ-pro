export const PLAN_NAMES = {
    FREE: 'Student & Basic',
    PRACTITIONER: 'Practitioner',
    ENTERPRISE: 'Enterprise'
};

export const PLAN_LIMITS = {
    [PLAN_NAMES.FREE]: {
        maxProjects: 3,
        features: ['basic-boq', 'pdf-export', 'community-support'],
        label: 'Free Forever',
        price: 'Free'
    },
    [PLAN_NAMES.PRACTITIONER]: {
        maxProjects: Infinity,
        features: ['material-intelligence', 'csv-export', 'pdf-export', 'priority-support', 'advanced-analysis'],
        label: 'Professional',
        price: '₦25,000'
    },
    [PLAN_NAMES.ENTERPRISE]: {
        maxProjects: Infinity,
        features: ['all'],
        label: 'Institutional',
        price: 'Custom'
    }
};

export const hasFeature = (userPlan, feature) => {
    const limits = PLAN_LIMITS[userPlan] || PLAN_LIMITS[PLAN_NAMES.FREE];
    if (limits.features.includes('all')) return true;
    return limits.features.includes(feature);
};
