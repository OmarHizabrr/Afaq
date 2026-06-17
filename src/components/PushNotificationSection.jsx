import React from 'react';
import { Bell, CheckCircle, Loader2 } from 'lucide-react';
import usePushNotifications from '../hooks/usePushNotifications';

const PushNotificationSection = ({ user }) => {
  const { permission, registered, busy, enable, supported, configured, fcmSupported } =
    usePushNotifications(user);

  if (!supported) {
    return (
      <section className="surface-card settings-push-card">
        <h2 className="settings-push-card__title">إشعارات الجهاز</h2>
        <p className="settings-push-card__hint">المتصفح الحالي لا يدعم إشعارات النظام.</p>
      </section>
    );
  }

  if (permission === 'granted') {
    return (
      <section className="surface-card settings-push-card">
        <h2 className="settings-push-card__title">إشعارات الجهاز</h2>
        <p className="settings-push-card__status settings-push-card__status--ok">
          <CheckCircle size={18} aria-hidden />
          {configured && fcmSupported && registered
            ? 'الإشعارات مفعّلة ومتصلة بالخادم'
            : configured && fcmSupported
              ? 'الإشعارات مسموحة — جاري الربط…'
              : 'إشعارات المتصفح مفعّلة'}
        </p>
        {!configured && (
          <p className="settings-push-card__hint">
            لإشعارات الخلفية (عند إغلاق التطبيق) أضف مفتاح VAPID في إعدادات الخادم.
          </p>
        )}
      </section>
    );
  }

  if (permission === 'denied') {
    return (
      <section className="surface-card settings-push-card">
        <h2 className="settings-push-card__title">إشعارات الجهاز</h2>
        <p className="settings-push-card__hint">
          الإشعارات محظورة من إعدادات المتصفح. افتح إعدادات الموقع واسمح بالإشعارات ثم أعد تحميل الصفحة.
        </p>
      </section>
    );
  }

  return (
    <section className="surface-card settings-push-card">
      <h2 className="settings-push-card__title">إشعارات الجهاز</h2>
      <p className="settings-push-card__hint">
        اسمح بالإشعارات لتصلك رسائل المحادثات والتنبيهات فوراً.
      </p>
      <button
        type="button"
        className="btn-md btn-md--primary settings-push-card__btn"
        onClick={enable}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="busy-btn__spin" size={16} aria-hidden />
        ) : (
          <Bell size={16} aria-hidden />
        )}
        تفعيل الإشعارات
      </button>
    </section>
  );
};

export default PushNotificationSection;
