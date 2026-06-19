import i18n from './index';

/** ترجمة خارج مكوّنات React (خدمات، أدوات، إلخ) */
export function translate(key, fallback = '') {
  const value = i18n.t(key, { defaultValue: '' });
  if (value && value !== key) return value;
  return fallback || key;
}

export default translate;
