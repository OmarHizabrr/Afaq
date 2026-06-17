import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app } from '../firebase';
import FirestoreApi from './firestoreApi';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';
const MAX_TOKENS = 8;

let messagingInstance = null;
let foregroundHandlerAttached = false;

export function getNotificationPermission() {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export function isPushConfigured() {
  return Boolean(VAPID_KEY);
}

export async function isPushMessagingSupported() {
  if (typeof Notification === 'undefined') return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export function isBrowserNotificationSupported() {
  return typeof Notification !== 'undefined';
}

async function getMessagingInstance() {
  if (messagingInstance) return messagingInstance;
  const supported = await isPushMessagingSupported();
  if (!supported) return null;
  messagingInstance = getMessaging(app);
  return messagingInstance;
}

async function getMessagingServiceWorkerRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

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
        dir: 'rtl',
        lang: 'ar',
      });
    }
  });
}

/**
 * طلب السماح ثم تسجيل FCM — يُستدعى من زر واضح للمستخدم.
 */
export async function requestAndRegisterPush(user) {
  const userId = user?.uid || user?.id;
  if (!userId) return { ok: false, reason: 'no-user', permission: getNotificationPermission() };
  if (!isPushConfigured()) return { ok: false, reason: 'missing-vapid', permission: getNotificationPermission() };

  try {
    const messaging = await getMessagingInstance();
    if (!messaging) {
      return { ok: false, reason: 'unsupported', permission: getNotificationPermission() };
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { ok: false, reason: 'denied', permission };
      }
    } else if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      return { ok: false, reason: 'denied', permission: Notification.permission };
    }

    const swReg = await getMessagingServiceWorkerRegistration();
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });

    if (!token) {
      return { ok: false, reason: 'no-token', permission: getNotificationPermission() };
    }

    await persistFcmToken(userId, token);
    attachForegroundHandler(messaging);
    return { ok: true, token, permission: 'granted' };
  } catch (err) {
    console.warn('requestAndRegisterPush', err);
    return { ok: false, reason: 'error', permission: getNotificationPermission(), err };
  }
}

/**
 * تسجيل FCM إذا كان الإذن ممنوحاً مسبقاً (بدون نافذة طلب جديدة).
 */
export async function registerPushMessaging(user) {
  if (getNotificationPermission() !== 'granted') {
    return { ok: false, reason: 'not-granted', permission: getNotificationPermission() };
  }
  return requestAndRegisterPush(user);
}
