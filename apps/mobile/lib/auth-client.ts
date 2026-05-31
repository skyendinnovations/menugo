import { createMobileAuthClient, sessionManager, storage } from '@menugo/auth/client';

const { authClient, signIn, signUp, signOut, getSession, useSession, $Infer } =
  createMobileAuthClient({
    baseURL: process.env.EXPO_PUBLIC_API_URL!,
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
  storage,
};
export { sessionManager } from '@menugo/auth/client';
