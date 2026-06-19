import React from 'react';
import { Download, Share, Smartphone, CheckCircle2 } from 'lucide-react';
import useInstallPrompt from '../hooks/useInstallPrompt';
import useAppTranslation from '../hooks/useAppTranslation';

const InstallAppSection = () => {
  const { t } = useAppTranslation();
  const { installed, iosHint, hasNativePrompt, promptInstall, canPrompt } = useInstallPrompt();

  if (installed) {
    return (
      <div className="surface-card surface-card--lg settings-install-card settings-install-card--done">
        <h2 className="settings-install-card__title">
          <CheckCircle2 size={20} color="var(--success-color)" />
          {t('components.InstallAppSection.التطبيق_مثبّت', 'التطبيق مثبّت')}
        </h2>
        <p className="settings-install-card__desc">
          {t('components.InstallAppSection.تستخدم_آفاق_كتطبيق_مستقل', 'تستخدم آفاق كتطبيق مستقل على جهازك — وصول سريع من الشاشة الرئيسية أو سطح المكتب.')}
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card surface-card--lg settings-install-card">
      <h2 className="settings-install-card__title">
        <Smartphone size={20} color="var(--text-secondary)" />
        {t('components.InstallAppSection.تثبيت_التطبيق', 'تثبيت التطبيق')}
      </h2>
      <p className="settings-install-card__desc">
        {t('components.InstallAppSection.ثبّت_آفاق_على_جهازك', 'ثبّت آفاق على هاتفك أو حاسوبك للوصول السريع دون فتح المتصفح في كل مرة.')}
      </p>

      {iosHint && !hasNativePrompt ? (
        <div className="settings-install-card__ios-steps">
          <p className="settings-install-card__ios-title">{t('components.InstallAppSection.على_iPhone_iPad', 'على iPhone / iPad:')}</p>
          <ol>
            <li>
              {t('components.InstallAppSection.اضغط_زر_المشاركة', 'اضغط زر المشاركة')} <Share size={14} className="settings-install-card__inline-icon" aria-hidden />
            </li>
            <li>{t('components.InstallAppSection.اختر_إضافة_إلى_الشاشة_الرئيسية', 'اختر «إضافة إلى الشاشة الرئيسية»')}</li>
            <li>{t('components.InstallAppSection.اضغط_إضافة', 'اضغط «إضافة»')}</li>
          </ol>
        </div>
      ) : null}

      {hasNativePrompt ? (
        <button type="button" className="google-btn google-btn--filled settings-install-card__btn" onClick={promptInstall}>
          <Download size={18} />
          {t('components.InstallAppSection.تثبيت_التطبيق_الآن', 'تثبيت التطبيق الآن')}
        </button>
      ) : canPrompt ? null : (
        <p className="settings-install-card__hint">
          {t('components.InstallAppSection.افتح_الموقع_من_Chrome', 'افتح الموقع من Chrome أو Edge على سطح المكتب أو أندرويد ليظهر خيار التثبيت.')}
        </p>
      )}
    </div>
  );
};

export default InstallAppSection;
