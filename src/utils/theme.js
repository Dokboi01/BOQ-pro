export const THEME_SETTING_KEY = 'theme_preference';
export const THEME_STORAGE_KEY = 'boq_pro_theme_preference';

export const THEME_OPTIONS = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
};

const VALID_THEMES = new Set(Object.values(THEME_OPTIONS));

export const normalizeThemePreference = (value) => (
  VALID_THEMES.has(value) ? value : THEME_OPTIONS.LIGHT
);

export const getSystemTheme = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return THEME_OPTIONS.LIGHT;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? THEME_OPTIONS.DARK
    : THEME_OPTIONS.LIGHT;
};

export const resolveThemePreference = (preference, systemTheme = getSystemTheme()) => {
  const normalized = normalizeThemePreference(preference);
  return normalized === THEME_OPTIONS.SYSTEM ? systemTheme : normalized;
};

export const readStoredThemePreference = () => {
  try {
    return normalizeThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return THEME_OPTIONS.LIGHT;
  }
};

export const writeStoredThemePreference = (preference) => {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizeThemePreference(preference));
  } catch {
    // Ignore storage failures and keep the in-memory theme active.
  }
};

export const applyResolvedTheme = (resolvedTheme) => {
  if (typeof document === 'undefined') return;

  const nextTheme = resolvedTheme === THEME_OPTIONS.DARK
    ? THEME_OPTIONS.DARK
    : THEME_OPTIONS.LIGHT;

  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.style.colorScheme = nextTheme;

  if (document.body) {
    document.body.dataset.theme = nextTheme;
  }
};

export const getNextThemePreference = (currentPreference, resolvedTheme) => {
  const normalized = normalizeThemePreference(currentPreference);
  if (normalized === THEME_OPTIONS.SYSTEM) {
    return resolvedTheme === THEME_OPTIONS.DARK ? THEME_OPTIONS.LIGHT : THEME_OPTIONS.DARK;
  }
  return normalized === THEME_OPTIONS.DARK ? THEME_OPTIONS.LIGHT : THEME_OPTIONS.DARK;
};
