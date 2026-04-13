import React, { createContext, useContext } from 'react';
import { useNotificationsRealtime } from '../hooks/useNotificationsRealtime';

const NotificationsBadgeContext = createContext({
  unreadCount: 0,
  requestBrowserPermission: async () => 'unsupported',
});

export function NotificationsBadgeProvider({ user, children }) {
  const value = useNotificationsRealtime(user);
  return <NotificationsBadgeContext.Provider value={value}>{children}</NotificationsBadgeContext.Provider>;
}

export function useNotificationBadge() {
  return useContext(NotificationsBadgeContext);
}
