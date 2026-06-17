import { useCallback, useEffect, useState } from 'react';
import {
  getNotificationPermission,
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
  const [supported, setSupported] = useState(false);
  const [dismissed, setDismissed] = useState(isDismissed);
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    let active = true;
    isPushMessagingSupported().then((ok) => {
      if (active) setSupported(ok);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user || permission !== 'granted') return;
    registerPushMessaging(user).then((result) => {
      if (result.ok) setRegistered(true);
    });
  }, [user, permission]);

  const enable = useCallback(async () => {
    if (!user) return { ok: false, reason: 'no-user' };
    setBusy(true);
    try {
      const result = await requestAndRegisterPush(user);
      setPermission(getNotificationPermission());
      if (result.ok) setRegistered(true);
      return result;
    } finally {
      setBusy(false);
    }
  }, [user]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setDismissed(true);
  }, []);

  const canPrompt =
    Boolean(user) &&
    supported &&
    isPushConfigured() &&
    permission === 'default' &&
    !dismissed;

  const needsEnable =
    Boolean(user) &&
    supported &&
    isPushConfigured() &&
    permission === 'default';

  return {
    canPrompt,
    needsEnable,
    permission,
    registered,
    busy,
    enable,
    dismiss,
    supported,
    configured: isPushConfigured(),
  };
}
