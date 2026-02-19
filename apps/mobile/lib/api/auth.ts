import BaseAPI from './base';
import { signIn, signUp, signOut, useSession as _useSession } from '../auth-client';
import type { SignInData, SignUpData, User } from '@menugo/dto';
import { ROUTES } from '@/lib/routes';
import { Platform } from 'react-native';
import { nativeGoogleSignIn, isNativeGoogleSignInAvailable } from '../google-signin';

export { _useSession as useSession };

export interface UpdateRoleData {
  userId: string;
  role: string;
}

class AuthAPI extends BaseAPI {
  async signIn(data: SignInData) {
    try {
      const result = await signIn.email(data);
      return result;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async signUp(data: SignUpData) {
    try {
      const result = await signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signOut(router?: any) {
    try {
      await signOut();
      if (router) {
        router.replace(ROUTES.AUTH.SIGN_IN);
      }
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async signInWithGoogle(callbackURL?: string) {
    try {
      // On native, use Google's native Sign-In SDK to get an idToken
      // and pass it directly to Better Auth (no browser redirect needed).
      if (isNativeGoogleSignInAvailable()) {
        const googleResult = await nativeGoogleSignIn();
        if (!googleResult) {
          return { data: null, error: null };
        }

        const result = await signIn.social({
          provider: 'google',
          idToken: {
            token: googleResult.idToken,
            accessToken: googleResult.accessToken,
          },
        });
        return result;
      }

      // Fallback: browser-based OAuth redirect (web platform)
      const defaultCallback =
        Platform.OS === 'web'
          ? typeof window !== 'undefined'
            ? window.location.origin
            : 'http://localhost:8081'
          : '/';

      const result = await signIn.social({
        provider: 'google',
        callbackURL: callbackURL || defaultCallback,
      });
      return result;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  }

  async updateUserRole(data: UpdateRoleData) {
    return this.post('/auth/update-role', data);
  }

  async getUser(userId: string): Promise<{ user: User }> {
    return this.get(`/auth/users/${userId}`);
  }

  async getUsers(): Promise<{ users: User[] }> {
    return this.get('/auth/users');
  }

  async updateProfile(userId: string, data: { name?: string }) {
    return this.patch<{ success: boolean; data: User }>(`/api/users/${userId}`, data);
  }
}

export const authAPI = new AuthAPI();
