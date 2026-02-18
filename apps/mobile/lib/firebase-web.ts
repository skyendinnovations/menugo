import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging as _getMessaging, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;

function getApp(): FirebaseApp {
  if (!_app) {
    const existing = getApps();
    _app = existing.length > 0 ? existing[0] : initializeApp(firebaseConfig);
  }
  return _app;
}

let _messaging: Messaging | null = null;

export function getWebMessaging(): Messaging {
  if (!_messaging) {
    _messaging = _getMessaging(getApp());
  }
  return _messaging;
}
