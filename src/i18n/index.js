import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ar from '../../assets/lang/ar.json';
import en from '../../assets/lang/en.json';
import sn from '../../assets/lang/sn.json';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, getLanguageMeta } from './languages';

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && ['ar', 'en', 'sn'].includes(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_LANGUAGE;
}

export function applyDocumentLanguage(lang) {
  const meta = getLanguageMeta(lang);
  const root = document.documentElement;
  root.lang = lang;
  root.dir = meta.dir;
  root.classList.remove('lang-ar', 'lang-en', 'lang-sn');
  root.classList.add(`lang-${lang}`);
}

const initialLang = typeof window !== 'undefined' ? readStoredLanguage() : DEFAULT_LANGUAGE;

if (typeof window !== 'undefined') {
  applyDocumentLanguage(initialLang);
}

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
    sn: { translation: sn },
  },
  lng: initialLang,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export function changeAppLanguage(lang) {
  const code = ['ar', 'en', 'sn'].includes(lang) ? lang : DEFAULT_LANGUAGE;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
  applyDocumentLanguage(code);
  return i18n.changeLanguage(code);
}

export default i18n;
