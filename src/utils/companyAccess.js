const slugify = (value = '') => String(value)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'icloud.com',
  'live.com',
  'msn.com',
  'aol.com',
  'proton.me',
  'protonmail.com',
  'gmx.com',
  'mail.com',
]);

const buildDerivedCompanyName = (domain = '') => {
  return domain
    .split('.')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const buildDomainCompanyKey = (domain = '') => {
  return slugify(domain.replace(/\.[a-z]{2,}$/i, ''));
};

const buildPersonalWorkspaceKey = (email = '') => {
  const normalizedEmail = slugify(String(email).toLowerCase());
  return normalizedEmail ? `private-${normalizedEmail}` : '';
};

const isPersonalDomain = (domain = '') => PERSONAL_EMAIL_DOMAINS.has(String(domain).toLowerCase());

export const getEmailDomain = (email = '') => {
  const [, domain = ''] = String(email).toLowerCase().split('@');
  return domain.trim();
};

export const buildCompanyKey = ({ companyKey = '', companyName = '', email = '' } = {}) => {
  const domain = getEmailDomain(email);
  const personalDomain = isPersonalDomain(domain);
  const normalizedCompanyKey = slugify(companyKey);
  const normalizedCompany = slugify(companyName);
  const derivedDomainKey = buildDomainCompanyKey(domain);
  const derivedDomainName = slugify(buildDerivedCompanyName(domain));

  if (normalizedCompanyKey) {
    if (!personalDomain || (normalizedCompanyKey !== derivedDomainKey && normalizedCompanyKey !== slugify(domain))) {
      return normalizedCompanyKey;
    }
  }

  if (normalizedCompany) {
    if (!personalDomain || normalizedCompany !== derivedDomainName) {
      return normalizedCompany;
    }
  }

  if (!domain) return normalizedCompanyKey || normalizedCompany;

  if (personalDomain) {
    return buildPersonalWorkspaceKey(email);
  }

  return derivedDomainKey;
};

export const deriveCompanyName = ({ companyName = '', email = '' } = {}) => {
  const domain = getEmailDomain(email);
  const personalDomain = isPersonalDomain(domain);
  const trimmedCompanyName = companyName?.trim();

  if (trimmedCompanyName) {
    if (!personalDomain || slugify(trimmedCompanyName) !== slugify(buildDerivedCompanyName(domain))) {
      return trimmedCompanyName;
    }
  }

  if (!domain) return 'Company Workspace';

  if (personalDomain) return 'Private Workspace';

  return buildDerivedCompanyName(domain);
};

export const isCustomModeProject = (project) => project?.projectMode === 'custom';

export const canAccessCompanyProject = (user, project) => {
  if (!user || !project) return false;

  const userEmail = String(user.email || '').toLowerCase();
  const userCompanyKey = buildCompanyKey({
    companyKey: user.company_key,
    companyName: user.company_name,
    email: user.email,
  });

  if (project.user_id && user.id && project.user_id === user.id) return true;

  if ((project.collaborators || []).some((entry) => entry.email === userEmail)) return true;

  if (project.access_mode === 'company') {
    return !!userCompanyKey && userCompanyKey === project.company_key;
  }

  return false;
};

export const buildProjectShareLink = (projectId, extraParams = {}) => {
  if (!projectId || typeof window === 'undefined') return '';

  const url = new URL(window.location.href);
  url.searchParams.set('project', projectId);
  url.searchParams.set('tab', 'workspace');

  Object.entries(extraParams).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, value);
  });

  return url.toString();
};
