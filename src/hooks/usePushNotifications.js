import { useCallback, useEffect, useState } from 'react';
import {
  getNotificationPermission,
  isBrowserNotificationSupported,
  isPushConfigured,
  isPushMessagingSupported,
  registerPushMessaging,
  requestAndRegisterPush,
} from '../services/pushMessaging';

const DISMISS_KEY = 'afaq-push-dismissed';
const DISMISS_DAYS = 14;

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export default function usePushNotifications(user) {
  const [permission, setPermission] = useState(getNotificationPermission());
  const [fcmSupported, setFcmSupported] = useState(false);
  const [dismissed, setDismissed] = useState(isDismissed);
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const browserSupported = isBrowserNotificationSupported();

  useEffect(() => {
    let active = true;
    isPushMessagingSupported().then((ok) => {
      if (active) setFcmSupported(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || permission !== 'granted') return;
    if (!isPushConfigured() || !fcmSupported) return;
    registerPushMessaging(user).then((result) => {
      if (result.ok) setRegistered(true);
    });
  }, [user, permission, fcmSupported]);

  const enable = useCallback(async () => {
    if (!user) return { ok: false, reason: 'no-user' };
    setBusy(true);
    try {
      if (isPushConfigured() && fcmSupported) {
        const result = await requestAndRegisterPush(user);
        setPermission(getNotificationPermission());
        if (result.ok) setRegistered(true);
        return result;
      }

      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        const next = await Notification.requestPermission();
        setPermission(next);
        return { ok: next === 'granted', permission: next, reason: next === 'granted' ? 'granted' : 'denied' };
      }

      const current = getNotificationPermission();
      setPermission(current);
      return { ok: current === 'granted', permission: current };
    } finally {
      setBusy(false);
    }
  }, [user, fcmSupported]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  const canPrompt =
    Boolean(user) && browserSupported && permission === 'default' && !dismissed;

  const needsEnable = Boolean(user) && browserSupported && permission === 'default';

  return {
    canPrompt,
    needsEnable,
    permission,
    registered,
    busy,
    enable,
    dismiss,
    supported: browserSupported,
    fcmSupported,
    configured: isPushConfigured(),
  };
}
