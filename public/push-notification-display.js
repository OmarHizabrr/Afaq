/* eslint-disable no-undef */
/** منطق عرض إشعارات Push — يُستورد من firebase-messaging-sw.js */

function pushAvatarUrl(photoURL, displayName) {
  if (photoURL && typeof photoURL === 'string' && photoURL.startsWith('http')) {
    return photoURL;
  }
  const name = (displayName || 'آفاق').trim() || 'آفاق';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1a73e8&color=fff&size=128`;
}

function buildPushNotificationDisplay(payload) {
  const n = payload.notification || {};
  const data = payload.data || {};
  const fromName = data.fromUserName || '';
  const icon = pushAvatarUrl(data.fromUserPhotoURL, fromName || n.title);
  const image =
    data.fromUserPhotoURL && data.fromUserPhotoURL.startsWith('http')
      ? data.fromUserPhotoURL
      : undefined;
  const title = n.title || 'آفاق';
  const body = n.body || '';

  return {
    title,
    options: {
      body,
      icon,
      badge: pushAvatarUrl('', 'آفاق'),
      image,
      data: { ...data },
      dir: 'rtl',
      lang: 'ar',
      tag: data.notificationId || data.conversationId || undefined,
    },
  };
}
