import React from 'react';
import { Download, Share, Smartphone, CheckCircle2 } from 'lucide-react';
import useInstallPrompt from '../hooks/useInstallPrompt';

const InstallAppSection = () => {
  const { installed, iosHint, hasNativePrompt, promptInstall, canPrompt } = useInstallPrompt();

  if (installed) {
    return (
      <div className="surface-card surface-card--lg settings-install-card settings-install-card--done">
        <h2 className="settings-install-card__title">
          <CheckCircle2 size={20} color="var(--success-color)" />
          التطبيق مثبّت
        </h2>
        <p className="settings-install-card__desc">
          تستخدم آفاق كتطبيق مستقل على جهازك — وصول سريع من الشاشة الرئيسية أو سطح المكتب.
        </p>
      </div>
    );
  }

  return (
    <div className="surface-card surface-card--lg settings-install-card">
      <h2 className="settings-install-card__title">
        <Smartphone size={20} color="var(--text-secondary)" />
        تثبيت التطبيق
      </h2>
      <p className="settings-install-card__desc">
        ثبّت آفاق على هاتفك أو حاسوبك للوصول السريع دون فتح المتصفح في كل مرة.
      </p>

      {iosHint && !hasNativePrompt ? (
        <div className="settings-install-card__ios-steps">
          <p className="settings-install-card__ios-title">على iPhone / iPad:</p>
          <ol>
            <li>
              اضغط زر المشاركة <Share size={14} className="settings-install-card__inline-icon" aria-hidden />
            </li>
            <li>اختر «إضافة إلى الشاشة الرئيسية»</li>
            <li>اضغط «إضافة»</li>
          </ol>
        </div>
      ) : null}

      {hasNativePrompt ? (
        <button type="button" className="google-btn google-btn--filled settings-install-card__btn" onClick={promptInstall}>
          <Download size={18} />
          تثبيت التطبيق الآن
        </button>
      ) : canPrompt ? null : (
        <p className="settings-install-card__hint">
          افتح الموقع من Chrome أو Edge على سطح المكتب أو أندرويد ليظهر خيار التثبيت.
        </p>
      )}
    </div>
  );
};

export default InstallAppSection;
