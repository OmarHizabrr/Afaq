import React from 'react';
import { Bell, X, Loader2 } from 'lucide-react';
import usePushNotifications from '../hooks/usePushNotifications';

const PushNotificationBanner = ({ user }) => {
  const { canPrompt, busy, enable, dismiss } = usePushNotifications(user);

  if (!canPrompt) return null;

  const handleEnable = async () => {
    await enable();
  };

  return (
    <div className="push-notification-banner" role="region" aria-label="تفعيل الإشعارات">
      <div className="push-notification-banner__content">
        <div className="push-notification-banner__icon" aria-hidden>
          <Bell size={20} />
        </div>
        <div className="push-notification-banner__text">
          <strong>فعّل الإشعارات</strong>
          <span>لتصلك رسائل المحادثات والتنبيهات فوراً حتى عند إغلاق التطبيق</span>
        </div>
      </div>
      <div className="push-notification-banner__actions">
        <button
          type="button"
          className="push-notification-banner__enable"
          onClick={handleEnable}
          disabled={busy}
        >
          {busy ? <Loader2 className="busy-btn__spin" size={16} aria-hidden /> : 'تفعيل'}
        </button>
        <button
          type="button"
          className="push-notification-banner__dismiss"
          onClick={dismiss}
          aria-label="لاحقاً"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default PushNotificationBanner;
