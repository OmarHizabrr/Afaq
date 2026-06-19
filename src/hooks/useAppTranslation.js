import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import useSiteContent from '../context/useSiteContent';

/**
 * ترجمة موحّدة: مفاتيح i18n أولاً، ثم نصوص Firestore (site copy)، ثم fallback.
 */
export default function useAppTranslation() {
  const { t, i18n } = useTranslation();
  const { str: siteStr } = useSiteContent();

  const appT = useCallback(
    (key, fallback = '') => {
      const translated = t(key, { defaultValue: '' });
      if (translated && translated !== key) return translated;
      const fromSite = siteStr(key, '');
      if (fromSite && fromSite !== key) return fromSite;
      return fallback || key;
    },
    [t, siteStr],
  );

  return { t: appT, i18n, rawT: t };
}
