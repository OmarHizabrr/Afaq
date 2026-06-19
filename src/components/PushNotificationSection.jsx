import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle, Loader2 } from 'lucide-react';
import usePushNotifications from '../hooks/usePushNotifications';
import FirestoreApi from '../services/firestoreApi';
import useAppTranslation from '../hooks/useAppTranslation';


const PushNotificationSection = ({ user }) => {
  const { t } = useAppTranslation();
  const { permission, registered, busy, enable, supported, configured, fcmSupported } =
    usePushNotifications(user);
  const [tokenCount, setTokenCount] = useState(null);
  const userId = user?.uid || user?.id;

  const canShowDiagnostics = useMemo(() => true, []);

  const title = t('components.PushNotificationSection.إشعارات_الجهاز', 'إشعارات الجهاز');
  const diagnostics = t(
    'components.PushNotificationSection.الحالة_vapid',
    `الحالة: VAPID=${configured ? 'ON' : 'OFF'} · FCM=${fcmSupported ? 'ON' : 'OFF'} · tokens=${tokenCount == null ? '—' : tokenCount}`
  );

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
        <h2 className="settings-push-card__title">{title}</h2>
        <p className="settings-push-card__hint">
          {t('components.PushNotificationSection.المتصفح_لا_يدعم_الإشعارات', 'المتصفح الحالي لا يدعم إشعارات النظام.')}
        </p>
      </section>
    );
  }

  if (permission === 'granted') {
    return (
      <section className="surface-card settings-push-card">
        <h2 className="settings-push-card__title">{title}</h2>
        <p className="settings-push-card__status settings-push-card__status--ok">
          <CheckCircle size={18} aria-hidden />
          {configured && fcmSupported && registered
            ? t('components.PushNotificationSection.الإشعارات_مفعّلة_ومتصلة_بالخادم', 'الإشعارات مفعّلة ومتصلة بالخادم')
            : configured && fcmSupported
              ? t('components.PushNotificationSection.الإشعارات_مسموحة_جاري_الربط', 'الإشعارات مسموحة — جاري الربط…')
              : t('components.PushNotificationSection.إشعارات_المتصفح_مفعّلة', 'إشعارات المتصفح مفعّلة')}
        </p>
        {!configured && (
          <p className="settings-push-card__hint">
            {t(
              'components.PushNotificationSection.لإشعارات_الخلفية_أضف_vapid',
              'لإشعارات الخلفية (عند إغلاق التطبيق) أضف مفتاح VAPID في إعدادات الخادم.'
            )}
          </p>
        )}
        {canShowDiagnostics && <p className="settings-push-card__hint">{diagnostics}</p>}
        {configured && fcmSupported && tokenCount === 0 && (
          <button
            type="button"
            className="btn-md btn-md--outline settings-push-card__btn"
            onClick={async () => {
              await enable();
              const api = FirestoreApi.Api;
              const doc = await api.getData(api.getUserDoc(userId));
              const tokens = Array.isArray(doc?.fcmTokens) ? doc.fcmTokens : [];
              setTokenCount(tokens.length);
            }}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="busy-btn__spin" size={16} aria-hidden />
            ) : (
              t('components.PushNotificationSection.إعادة_ربط_الجهاز', 'إعادة ربط الجهاز')
            )}
          </button>
        )}
      </section>
    );
  }

  if (permission === 'denied') {
    return (
      <section className="surface-card settings-push-card">
        <h2 className="settings-push-card__title">{title}</h2>
        <p className="settings-push-card__hint">
          {t(
            'components.PushNotificationSection.الإشعارات_محظورة',
            'الإشعارات محظورة من إعدادات المتصفح. افتح إعدادات الموقع واسمح بالإشعارات ثم أعد تحميل الصفحة.'
          )}
        </p>
      </section>
    );
  }

  return (
    <section className="surface-card settings-push-card">
      <h2 className="settings-push-card__title">{title}</h2>
      <p className="settings-push-card__hint">
        {t(
          'components.PushNotificationSection.اسمح_بالإشعارات',
          'اسمح بالإشعارات لتصلك رسائل المحادثات والتنبيهات فوراً.'
        )}
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
        {t('components.PushNotificationSection.تفعيل_الإشعارات', 'تفعيل الإشعارات')}
      </button>
      {canShowDiagnostics && (
        <p className="settings-push-card__hint" style={{ marginTop: '10px' }}>
          {diagnostics}
        </p>
      )}
    </section>
  );
};

export default PushNotificationSection;
