const slugify = (value = '') => String(value)
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const getEmailDomain = (email = '') => {
  const [, domain = ''] = String(email).toLowerCase().split('@');
  return domain.trim();
};

export const buildCompanyKey = ({ companyKey = '', companyName = '', email = '' } = {}) => {
  if (companyKey) return slugify(companyKey);

  const normalizedCompany = slugify(companyName);
  if (normalizedCompany) return normalizedCompany;

  const domain = getEmailDomain(email);
  if (!domain) return '';

  return slugify(domain.replace(/\.[a-z]{2,}$/i, ''));
};

export const deriveCompanyName = ({ companyName = '', email = '' } = {}) => {
  if (companyName?.trim()) return companyName.trim();

  const domain = getEmailDomain(email);
  if (!domain) return 'Company Workspace';

  return domain
    .split('.')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
