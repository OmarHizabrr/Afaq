import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle, Loader2 } from 'lucide-react';
import usePushNotifications from '../hooks/usePushNotifications';
import FirestoreApi from '../services/firestoreApi';

const PushNotificationSection = ({ user }) => {
  const { permission, registered, busy, enable, supported, configured, fcmSupported } =
    usePushNotifications(user);
  const [tokenCount, setTokenCount] = useState(null);
  const userId = user?.uid || user?.id;

  const canShowDiagnostics = useMemo(() => true, []);

  useEffect(() => {
    let active = true;
    if (!userId) return undefined;
    const api = FirestoreApi.Api;
    api
      .getData(api.getUserDoc(userId))
      .then((doc) => {
        if (!active) return;
        const tokens = Array.isArray(doc?.fcmTokens) ? doc.fcmTokens : [];
        setTokenCount(tokens.length);
      })
      .catch(() => {
        if (active) setTokenCount(null);
      });
    return () => {
      active = false;
    };
  }, [userId, registered, permission]);

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
        {canShowDiagnostics && (
          <p className="settings-push-card__hint">
            الحالة: VAPID={configured ? 'ON' : 'OFF'} · FCM={fcmSupported ? 'ON' : 'OFF'} · tokens=
            {tokenCount == null ? '—' : tokenCount}
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
      {canShowDiagnostics && (
        <p className="settings-push-card__hint" style={{ marginTop: '10px' }}>
          الحالة: VAPID={configured ? 'ON' : 'OFF'} · FCM={fcmSupported ? 'ON' : 'OFF'} · tokens=
          {tokenCount == null ? '—' : tokenCount}
        </p>
      )}
    </section>
  );
};

export default PushNotificationSection;
