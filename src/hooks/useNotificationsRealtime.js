import { useState, useEffect, useCallback } from 'react';
import FirestoreApi from '../services/firestoreApi';
import { buildInboxNotificationOptions } from '../utils/notificationDisplay';
import useAppTranslation from './useAppTranslation';


/**
 * اشتراك صندوق الإشعارات + عدّاد غير المقروء + تنبيهات المتصفح عند إخفاء التبويب.
 */
export function useNotificationsRealtime(user) {
  const { t } = useAppTranslation();
  const actorId = user?.uid || user?.id;
  const [unreadCount, setUnreadCount] = useState(0);

  const requestBrowserPermission = useCallback(async () => {
    if (!user) return 'unsupported';
    const { requestAndRegisterPush } = await import('../services/pushMessaging');
    const result = await requestAndRegisterPush(user);
    return result.permission || (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  }, [user]);

  useEffect(() => {
    if (!actorId) return undefined;

    const api = FirestoreApi.Api;
    const q = api.getNotificationsInboxQuery(actorId);
    let firstSnapshot = true;

    const unsub = api.subscribeSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setUnreadCount(docs.filter((n) => !n.isRead).length);

        if (firstSnapshot) {
          firstSnapshot = false;
          return;
        }

        if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        if (document.visibilityState === 'visible') return;

        snapshot.docChanges().forEach((ch) => {
          if (ch.type !== 'added') return;
          const data = ch.doc.data();
          if (data.fromUserId === actorId) return;
          if (data.isRead) return;
          try {
            new Notification(
              data.title || t('context.siteContentContext.آفاق', 'آفاق'),
              buildInboxNotificationOptions(data, ch.doc.id),
            );
          } catch {
            /* ignore */
          }
        });
      },
      (err) => console.error('notifications snapshot', err)
    );

    return () => unsub();
  }, [actorId, t]);

  return { unreadCount, requestBrowserPermission };
}
