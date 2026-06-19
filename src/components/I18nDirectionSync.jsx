import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { applyDocumentLanguage } from '../i18n';
import { getLanguageMeta } from '../i18n/languages';

/** يزامن اتجاه ولغة المستند عند تغيير اللغة */
export default function I18nDirectionSync({ children }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const handler = (lng) => applyDocumentLanguage(lng);
    handler(i18n.language);
    i18n.on('languageChanged', handler);
    return () => i18n.off('languageChanged', handler);
  }, [i18n]);

  const dir = getLanguageMeta(i18n.language).dir;

  return (
    <div dir={dir} className="i18n-root">
      {children}
    </div>
  );
}
