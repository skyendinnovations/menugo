import { Platform } from 'react-native';

let GoogleSignin: any = null;
let statusCodes: any = null;

if (Platform.OS !== 'web') {
  try {
    const module = require('@react-native-google-signin/google-signin');
    GoogleSignin = module.GoogleSignin;
    statusCodes = module.statusCodes;
  } catch {
    // Module not available (web or not installed)
  }
}

const WEB_CLIENT_ID =
  '81808079460-u6enlld6ak076gcu2dha5li8lkdpblie.apps.googleusercontent.com';

let configured = false;

function ensureConfigured() {
  if (configured || !GoogleSignin) return;
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: false,
  });
  configured = true;
}

export interface GoogleSignInResult {
  idToken: string;
  accessToken?: string;
}

export async function nativeGoogleSignIn(): Promise<GoogleSignInResult | null> {
  if (Platform.OS === 'web' || !GoogleSignin) {
    return null;
  }

  ensureConfigured();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response.type === 'cancelled') {
      return null;
    }

    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error('No idToken received from Google Sign-In');
    }

    const tokens = await GoogleSignin.getTokens();

    return {
      idToken,
      accessToken: tokens?.accessToken,
    };
  } catch (error: any) {
    if (statusCodes && error.code === statusCodes.SIGN_IN_CANCELLED) {
      return null;
    }
    if (statusCodes && error.code === statusCodes.IN_PROGRESS) {
      return null;
    }
    if (statusCodes && error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Google Play Services is not available on this device');
    }
    throw error;
  }
}

export function isNativeGoogleSignInAvailable(): boolean {
  return Platform.OS !== 'web' && GoogleSignin !== null;
}
