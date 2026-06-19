import React from 'react';
import { Download, Share, X } from 'lucide-react';
import useInstallPrompt from '../hooks/useInstallPrompt';
import useAppTranslation from '../hooks/useAppTranslation';

const InstallAppBanner = () => {
  const { t } = useAppTranslation();
  const { canPrompt, iosHint, hasNativePrompt, promptInstall, dismiss } = useInstallPrompt();

  if (!canPrompt) return null;

  const handleInstall = async () => {
    if (hasNativePrompt) {
      await promptInstall();
    }
  };

  return (
    <div className="install-app-banner" role="region" aria-label={t('components.InstallAppBanner.تثبيت_التطبيق', 'تثبيت التطبيق')}>
      <div className="install-app-banner__content">
        <div className="install-app-banner__icon" aria-hidden>
          <Download size={20} />
        </div>
        <div className="install-app-banner__text">
          <strong>ثبّت تطبيق آفاق</strong>
          {iosHint && !hasNativePrompt ? (
            <span>
              اضغط <Share size={14} className="install-app-banner__inline-icon" aria-hidden /> ثم
              «إضافة إلى الشاشة الرئيسية»
            </span>
          ) : (
            <span>وصول أسرع من سطح المكتب أو الهاتف</span>
          )}
        </div>
      </div>
      <div className="install-app-banner__actions">
        {hasNativePrompt ? (
          <button type="button" className="install-app-banner__install" onClick={handleInstall}>
            تثبيت
          </button>
        ) : null}
        <button
          type="button"
          className="install-app-banner__dismiss"
          onClick={dismiss}
          aria-label={t('components.InstallAppBanner.إغلاق', 'إغلاق')}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default InstallAppBanner;
