import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { changeAppLanguage } from '../i18n';
import { SUPPORTED_LANGUAGES } from '../i18n/languages';
import useAppTranslation from '../hooks/useAppTranslation';

const LanguageMenuButton = ({ className = '' }) => {
  const { t, i18n } = useAppTranslation();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const current = i18n.language || 'ar';

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const selectLanguage = (code) => {
    changeAppLanguage(code);
    setOpen(false);
  };

  return (
    <div className={`language-menu ${className}`.trim()} ref={wrapRef}>
      <button
        type="button"
        className="icon-btn language-menu__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t('settings.language_title', 'لغة الواجهة')}
        aria-label={t('settings.language_title', 'لغة الواجهة')}
      >
        <Globe size={20} />
        <span className="language-menu__code" aria-hidden>
          {current.toUpperCase()}
        </span>
      </button>

      {open ? (
        <div className="language-menu__panel" role="menu">
          <p className="language-menu__heading">{t('settings.language_label', 'اللغة')}</p>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const active = current === lang.code;
            return (
              <button
                key={lang.code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`language-menu__option${active ? ' language-menu__option--active' : ''}`}
                onClick={() => selectLanguage(lang.code)}
              >
                <span>{lang.nativeLabel}</span>
                {active ? <Check size={16} aria-hidden /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default LanguageMenuButton;
