/** بناء خيارات إشعار المتصفح مع صورة المرسل */

export function avatarUrlForNotification(photoURL, displayName) {
  if (photoURL && typeof photoURL === 'string' && photoURL.startsWith('http')) {
    return photoURL;
  }
  const name = (displayName || 'آفاق').trim() || 'آفاق';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a73e8&color=fff&size=128`;
}

export function buildFcmNotificationOptions(payload) {
  const n = payload.notification || {};
  const data = payload.data || {};
  const fromName = data.fromUserName || '';
  const icon = avatarUrlForNotification(data.fromUserPhotoURL, fromName || n.title);
  const image =
    data.fromUserPhotoURL && data.fromUserPhotoURL.startsWith('http')
      ? data.fromUserPhotoURL
      : undefined;

  return {
    body: n.body || '',
    icon,
    badge: avatarUrlForNotification('', 'آفاق'),
    image,
    data: data || {},
    dir: 'rtl',
    lang: 'ar',
    tag: data.notificationId || data.conversationId || undefined,
  };
}

export function buildInboxNotificationOptions(inboxItem, docId) {
  const icon = avatarUrlForNotification(inboxItem.fromUserPhotoURL, inboxItem.fromUserName);
  const image =
    inboxItem.fromUserPhotoURL && inboxItem.fromUserPhotoURL.startsWith('http')
      ? inboxItem.fromUserPhotoURL
      : undefined;

  return {
    body: inboxItem.body || '',
    icon,
    badge: avatarUrlForNotification('', 'آفاق'),
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
