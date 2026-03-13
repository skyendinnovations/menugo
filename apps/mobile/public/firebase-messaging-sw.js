/* eslint-disable no-undef */
importScripts(
  'https://www.gstatic.com/firebasejs/11.8.1/firebase-app-compat.js'
);
importScripts(
  'https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging-compat.js'
);

// Read the API URL from the query param set during registration
const params = new URL(self.location).searchParams;
const apiUrl = params.get('apiUrl');

// Fetch Firebase config from backend and initialize
async function initFirebase() {
  if (!apiUrl) {
    console.error('[SW] No apiUrl query param provided');
    return;
  }

  try {
    const res = await fetch(`${apiUrl}/api/config/firebase`);
    const config = await res.json();
    firebase.initializeApp(config);

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage(function (payload) {
      const notification = payload.notification || {};
      const title = notification.title || 'MenuGo';
      const options = {
        body: notification.body || '',
        icon: '/favicon.png',
        data: payload.data,
      };

      self.registration.showNotification(title, options);
    });
  } catch (err) {
    console.error('[SW] Failed to fetch Firebase config:', err);
  }
}

initFirebase();

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const data = event.notification.data;
  const targetPath = data && data.restaurantId
    ? '/(admin)/restaurants/' + data.restaurantId + '/orders'
    : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // Focus an existing window if one is open
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if ('focus' in client) {
          return client.focus().then(function (focusedClient) {
            if (focusedClient.url !== new URL(targetPath, self.location.origin).href) {
              focusedClient.navigate(targetPath);
            }
            return focusedClient;
          });
        }
      }
      // No existing window — open a new one
      return clients.openWindow(targetPath);
    })
  );
});
