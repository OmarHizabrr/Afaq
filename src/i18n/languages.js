/** اللغات المدعومة في المنصة */
export const SUPPORTED_LANGUAGES = [
  { code: 'ar', label: 'العربية', nativeLabel: 'العربية', dir: 'rtl' },
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr' },
  { code: 'sn', label: 'ChiShona', nativeLabel: 'ChiShona (الشيشو)', dir: 'ltr' },
];

export const DEFAULT_LANGUAGE = 'ar';
export const LANGUAGE_STORAGE_KEY = 'afaq-language';

export function getLanguageMeta(code) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) || SUPPORTED_LANGUAGES[0];
}

export function isRtlLanguage(code) {
  return getLanguageMeta(code).dir === 'rtl';
}
