import React from 'react';
import { Globe } from 'lucide-react';
import { changeAppLanguage } from '../i18n';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';
import useAppTranslation from '../hooks/useAppTranslation';

export default function LanguageSwitcher() {
  const { t, i18n } = useAppTranslation();
  const current = i18n.language || 'ar';

  const handleChange = (e) => {
    const lang = e.target.value;
    changeAppLanguage(lang);
  };

  return (
    <div className="surface-card surface-card--lg settings-language-card">
      <h2 className="settings-language-card__title">
        <Globe size={20} color="var(--text-secondary)" />
        {t('settings.language_title', 'لغة الواجهة')}
      </h2>
      <p className="settings-language-card__hint">
        {t('settings.language_hint', 'اختر لغة عرض المنصة — العربية، الإنجليزية، أو الشيشو (ChiShona).')}
      </p>
      <div className="app-field">
        <label className="app-label" htmlFor="afaq-language-select">
          {t('settings.language_label', 'اللغة')}
        </label>
        <select
          id="afaq-language-select"
          className="app-input app-select"
          value={current}
          onChange={handleChange}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.nativeLabel}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
