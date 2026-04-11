const warnStorage = (action, key, error) => {
  console.warn(`Storage ${action} failed for "${key}":`, error?.message || error);
};

export const safeStorageGet = (key) => {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage?.getItem(key) ?? null;
  } catch (error) {
    warnStorage('read', key, error);
    return null;
  }
};

export const safeStorageSet = (key, value) => {
  try {
    if (typeof window === 'undefined') return false;
    window.localStorage?.setItem(key, value);
    return true;
  } catch (error) {
    warnStorage('write', key, error);
    return false;
  }
};

export const safeStorageRemove = (key) => {
  try {
    if (typeof window === 'undefined') return false;
    window.localStorage?.removeItem(key);
    return true;
  } catch (error) {
    warnStorage('remove', key, error);
    return false;
  }
};
