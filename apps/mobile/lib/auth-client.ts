import { createMobileAuthClient, sessionManager, storage } from '@menugo/auth/client';
import { API_URL } from './api-url';

const { authClient, signIn, signUp, signOut, getSession, useSession, $Infer } =
  createMobileAuthClient({
    baseURL: API_URL,
    scheme: 'menugo',
  });

export {
  authClient,
  signIn,
  signUp,
  signOut,
  getSession,
  useSession,
  $Infer,
  sessionManager,
  storage,
};
