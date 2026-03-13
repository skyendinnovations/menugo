import { Platform } from 'react-native';

/**
 * Resolves the API base URL based on the current platform.
 *
 * On **web** (desktop browser), `localhost` works because the browser runs on
 * the same machine as the backend. We must use `localhost` so that session
 * cookies set by Better Auth during OAuth flows are sent back correctly
 * (same-origin).
 *
 * On **native** (Android/iOS), `localhost` refers to the device itself, so we
 * need the machine's real IP address that was set in EXPO_PUBLIC_API_URL.
 */
export function getApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

  if (Platform.OS === 'web') {
    // On web, always use localhost so cookies work (same origin)
    try {
      const url = new URL(envUrl);
      return `http://localhost:${url.port || '5000'}`;
    } catch {
      return 'http://localhost:5000';
    }
  }

  // On native, use the env URL as-is (machine IP)
  return envUrl;
}

export const API_URL = getApiUrl();
