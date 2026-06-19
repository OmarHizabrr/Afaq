/** بناء خيارات إشعار المتصفح مع صورة المرسل */
import translate from '../i18n/translate';

export function getDefaultAppName(t = translate) {
  return t('context.siteContentContext.آفاق', 'آفاق');
}

export function avatarUrlForNotification(photoURL, displayName, t = translate) {
  const defaultName = getDefaultAppName(t);
  if (photoURL && typeof photoURL === 'string' && photoURL.startsWith('http')) {
    return photoURL;
  }
  const name = (displayName || defaultName).trim() || defaultName;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a73e8&color=fff&size=128`;
}

export function buildFcmNotificationOptions(payload, t = translate) {
  const n = payload.notification || {};
  const data = payload.data || {};
  const fromName = data.fromUserName || '';
  const icon = avatarUrlForNotification(data.fromUserPhotoURL, fromName || n.title, t);
  const image =
    data.fromUserPhotoURL && data.fromUserPhotoURL.startsWith('http')
      ? data.fromUserPhotoURL
      : undefined;

  return {
    body: n.body || '',
    icon,
    badge: avatarUrlForNotification('', '', t),
    image,
    data: data || {},
    dir: 'rtl',
    lang: 'ar',
    tag: data.notificationId || data.conversationId || undefined,
  };
}

export function buildInboxNotificationOptions(inboxItem, docId, t = translate) {
  const icon = avatarUrlForNotification(inboxItem.fromUserPhotoURL, inboxItem.fromUserName, t);
  const image =
    inboxItem.fromUserPhotoURL && inboxItem.fromUserPhotoURL.startsWith('http')
      ? inboxItem.fromUserPhotoURL
      : undefined;

  return {
    body: inboxItem.body || '',
    icon,
    badge: avatarUrlForNotification('', '', t),
    image,
    tag: docId,
    dir: 'rtl',
    lang: 'ar',
    data: {
      notificationId: docId,
      conversationId: inboxItem.conversationId || '',
      fromUserId: inboxItem.fromUserId || '',
      fromUserName: inboxItem.fromUserName || '',
    },
  };
}
