import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app } from '../firebase';
import FirestoreApi from './firestoreApi';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
const MAX_TOKENS = 8;

let messagingInstance = null;
let foregroundHandlerAttached = false;

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  const supported = await isSupported();
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

async function getMessagingServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

/**
 * حفظ رمز FCM على مستند المستخدم لاستخدامه من Cloud Functions.
 */
async function persistFcmToken(userId, token) {
  const api = FirestoreApi.Api;
  const userRef = api.getUserDoc(userId);
  const existing = await api.getData(userRef);
  const tokens = Array.isArray(existing?.fcmTokens) ? existing.fcmTokens : [];
  if (tokens.includes(token)) return;

  const next = [...tokens, token].slice(-MAX_TOKENS);
  await api.setData({
    docRef: userRef,
    data: { fcmTokens: next },
    merge: true,
  });
}

function attachForegroundHandler(messaging) {
  if (foregroundHandlerAttached) return;
  foregroundHandlerAttached = true;
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || 'آفاق';
    const body = payload.notification?.body || '';
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icon-512.png',
        data: payload.data || {},
      });
    }
  });
}

/**
 * تسجيل الإشعارات الفورية بعد تسجيل الدخول.
 */
export async function registerPushMessaging(user) {
  const userId = user?.uid || user?.id;
  if (!userId) return { ok: false, reason: 'no-user' };
  if (!VAPID_KEY) return { ok: false, reason: 'missing-vapid' };

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) return { ok: false, reason: 'unsupported' };

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return { ok: false, reason: 'denied' };
    } else if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      return { ok: false, reason: 'denied' };
    }

    const swReg = await getMessagingServiceWorkerRegistration();
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) return { ok: false, reason: 'no-token' };

    await persistFcmToken(userId, token);
    attachForegroundHandler(messaging);
    return { ok: true, token };
  } catch (err) {
    console.warn('registerPushMessaging', err);
    return { ok: false, reason: 'error', err };
  }
}
