import { Platform } from 'react-native';
import { router } from 'expo-router';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { refreshEmitter, eventToChannels } from './realtime';

// Lazy-load expo-notifications only on native to avoid crash on web.
// Push notification support was removed from Expo Go in SDK 53+;
// the native module throws a fatal error, so we must skip the import entirely.
let Notifications: typeof import('expo-notifications') | null = null;

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (Platform.OS !== 'web' && !isExpoGo) {
  try {
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
  } catch (e) {
    console.warn(
      'expo-notifications is not available. ' +
      'Use a development build for push notifications.',
    );
    Notifications = null;
  }
} else if (isExpoGo && Platform.OS !== 'web') {
  console.warn(
    'Push notifications are not supported in Expo Go (SDK 53+). ' +
    'Use a development build instead.',
  );
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

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    console.error('Expo project ID not found — cannot register for push');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
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
      const data = notification.request.content.data;
      // Emit refresh events based on push notification data
      const eventType = data?.type as string | undefined;
      if (eventType) {
        eventToChannels(eventType).forEach((ch) => refreshEmitter.emit(ch));
      }
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

  const subscription = Notifications.addPushTokenListener(async () => {
    // Device push token changed — re-fetch the Expo push token
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) return;
      const newTokenData = await Notifications!.getExpoPushTokenAsync({ projectId });
      onTokenRefresh(newTokenData.data);
    } catch (err) {
      console.error('Failed to refresh Expo push token:', err);
    }
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
      // Emit refresh events based on push notification data
      const eventType = payload.data?.type as string | undefined;
      if (eventType) {
        eventToChannels(eventType).forEach((ch) => refreshEmitter.emit(ch));
      }

      const notification = payload.notification;
      if (!notification) return;

      // Show browser notification for foreground messages
      if (Notification.permission === 'granted') {
        const n = new Notification(notification.title || 'MenuGo', {
          body: notification.body || '',
          icon: '/favicon.png',
          data: payload.data,
        });
        n.onclick = () => {
          window.focus();
          const d = payload.data;
          if (d?.restaurantId) {
            router.push(
              `/(admin)/restaurants/${d.restaurantId}/orders` as any
            );
          }
          n.close();
        };
      }
    });

    return { remove: unsubscribe };
  } catch (err) {
    console.error('Web foreground handler setup failed:', err);
    return undefined;
  }
}
