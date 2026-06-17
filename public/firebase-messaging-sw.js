/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBG8_7vI_tKujbJ_tpcaPL6NGNwCygC4hU',
  authDomain: 'afaq-foundation.firebaseapp.com',
  projectId: 'afaq-foundation',
  storageBucket: 'afaq-foundation.firebasestorage.app',
  messagingSenderId: '790510406588',
  appId: '1:790510406588:web:95b0b3aacf224913d6b9b9',
});

importScripts('/push-notification-display.js');

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, options } = buildPushNotificationDisplay(payload);
  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const path = data.conversationId
    ? `/notifications?chat=${data.conversationId}`
    : '/notifications';
  const url = new URL(path, self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
      return undefined;
    }),
  );
});
