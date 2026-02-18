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
  if (data && data.restaurantId) {
    const url = '/(admin)/restaurants/' + data.restaurantId;
    event.waitUntil(clients.openWindow(url));
  }
});
