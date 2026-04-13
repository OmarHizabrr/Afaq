import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const DISMISS_KEY = 'afaq-pwa-install-dismissed';

const PwaInstallBanner = () => {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem(DISMISS_KEY) === '1' : false
  );
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
    const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIos(ios);
    setIsStandalone(
      typeof window !== 'undefined' &&
        (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)
    );

    const onBip = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onBip);
    return () => window.removeEventListener('beforeinstallprompt', onBip);
  }, []);

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  if (dismissed || isStandalone) return null;

  if (isIos) {
    return (
      <div className="pwa-banner pwa-banner--ios" role="note">
        <Download size={18} />
        <span>لتثبيت آفاق: اضغط مشاركة ثم «إضافة إلى الشاشة الرئيسية».</span>
        <button type="button" className="pwa-banner__close" onClick={dismiss} aria-label="إغلاق">
          <X size={18} />
        </button>
      </div>
    );
  }

  if (!deferred) return null;

  return (
    <div className="pwa-banner" role="region" aria-label="تثبيت التطبيق">
      <Download size={18} />
      <span>ثبّت آفاق على جهازك للوصول السريع ووضع التطبيق.</span>
      <button type="button" className="google-btn google-btn--filled pwa-banner__btn" onClick={install}>
        تثبيت
      </button>
      <button type="button" className="pwa-banner__close" onClick={dismiss} aria-label="إغلاق">
        <X size={18} />
      </button>
    </div>
  );
};

export default PwaInstallBanner;
