import { Platform } from 'react-native';
import { router } from 'expo-router';

// Lazy-load expo-notifications only on native to avoid crash on web
let Notifications: typeof import('expo-notifications') | null = null;

if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');

  Notifications!.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Web implementation using Firebase Cloud Messaging ───

async function registerForPushNotificationsWeb(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Web notification permission not granted');
      return null;
    }

    // Register service worker for background notifications
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || '';
    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?apiUrl=${encodeURIComponent(apiUrl)}`
    );

    const { getWebMessaging } = await import('./firebase-web');
    const { getToken } = await import('firebase/messaging');

    const vapidKey = process.env.EXPO_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.error('EXPO_PUBLIC_FIREBASE_VAPID_KEY is not set');
      return null;
    }

    const messaging = getWebMessaging();
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    return token;
  } catch (err) {
    console.error('Web push registration failed:', err);
    return null;
  }
}

// ─── Native implementation using expo-notifications ───

async function registerForPushNotificationsNative(): Promise<string | null> {
  if (!Notifications) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  const tokenData = await Notifications.getDevicePushTokenAsync();
  const token = tokenData.data;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Orders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F97316',
      sound: 'default',
    });
  }

  return token as string;
}

// ─── Unified exports ───

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return registerForPushNotificationsWeb();
  }
  return registerForPushNotificationsNative();
}

export function setupNotificationResponseHandler() {
  if (Platform.OS === 'web' || !Notifications) return undefined;

  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      if (data?.restaurantId) {
        router.push(
          `/(admin)/restaurants/${data.restaurantId}/orders` as any
        );
      }
    }
  );
  return subscription;
}

export function setupForegroundNotificationHandler() {
  if (Platform.OS === 'web') {
    // On web, foreground messages are handled via onMessage listener
    return undefined;
  }
  if (!Notifications) return undefined;

  const subscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Foreground notification:', notification.request.content.title);
    }
  );
  return subscription;
}

export function setupTokenRefreshHandler(
  onTokenRefresh: (token: string) => void
) {
  if (Platform.OS === 'web') {
    // Web FCM handles token refresh internally; no explicit listener needed
    return undefined;
  }
  if (!Notifications) return undefined;

  const subscription = Notifications.addPushTokenListener((tokenData) => {
    onTokenRefresh(tokenData.data as string);
  });
  return subscription;
}

export async function setupWebForegroundHandler() {
  if (Platform.OS !== 'web') return undefined;

  try {
    const { getWebMessaging } = await import('./firebase-web');
    const { onMessage } = await import('firebase/messaging');
    const messaging = getWebMessaging();

    const unsubscribe = onMessage(messaging, (payload) => {
      const notification = payload.notification;
      if (!notification) return;

      // Show browser notification for foreground messages
      if (Notification.permission === 'granted') {
        new Notification(notification.title || 'MenuGo', {
          body: notification.body || '',
          icon: '/favicon.png',
          data: payload.data,
        });
      }
    });

    return { remove: unsubscribe };
  } catch (err) {
    console.error('Web foreground handler setup failed:', err);
    return undefined;
  }
}
