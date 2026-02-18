import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import {
  registerForPushNotifications,
  setupNotificationResponseHandler,
  setupForegroundNotificationHandler,
  setupTokenRefreshHandler,
  setupWebForegroundHandler,
} from '@/lib/notifications';
import { notificationAPI } from '@/lib/api/notification';

export function useNotifications(isAuthenticated: boolean) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || initialized.current) return;

    initialized.current = true;

    let responseSub: { remove(): void } | undefined;
    let foregroundSub: { remove(): void } | undefined;
    let tokenRefreshSub: { remove(): void } | undefined;
    let webForegroundSub: { remove(): void } | undefined;

    const deviceType = Platform.OS === 'web' ? 'web' : (Platform.OS as 'ios' | 'android');

    (async () => {
      try {
        const token = await registerForPushNotifications();
        if (token) {
          await notificationAPI
            .registerToken({ token, deviceType })
            .catch((err) =>
              console.error('Failed to register token with backend:', err)
            );
        }

        responseSub = setupNotificationResponseHandler();
        foregroundSub = setupForegroundNotificationHandler();

        if (Platform.OS === 'web') {
          webForegroundSub = await setupWebForegroundHandler();
        }

        tokenRefreshSub = setupTokenRefreshHandler(async (newToken) => {
          await notificationAPI
            .registerToken({ token: newToken, deviceType })
            .catch((err) =>
              console.error('Failed to re-register refreshed token:', err)
            );
        });
      } catch (err) {
        console.error('Push notification setup failed:', err);
      }
    })();

    return () => {
      responseSub?.remove();
      foregroundSub?.remove();
      tokenRefreshSub?.remove();
      webForegroundSub?.remove();
    };
  }, [isAuthenticated]);
}
