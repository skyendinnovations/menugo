import BaseAPI from './base';
import { signIn, signUp, signOut, useSession as _useSession } from '../auth-client';
import type { SignInData, SignUpData, User } from '@menugo/dto';

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

      // If admin role was selected, update it via custom endpoint
      if (data.role === 'admin' && result.data?.user?.id && result.data?.token) {
        try {
          // Call update-role endpoint with the auth token from sign-up
          const response = await fetch(`${this.baseURL}/auth/update-role`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${result.data.token}`,
            },
            body: JSON.stringify({
              userId: result.data.user.id,
              role: data.role,
            }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('Failed to update role:', error);
          } else {
            const roleResult = await response.json();
            console.log('Role updated:', roleResult);
          }
        } catch (err) {
          console.error('Error updating role:', err);
          // Continue anyway, user will have default role
        }
      }

      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async signOut(router?: any) {
    try {
      await signOut();
      // If router is provided, navigate to sign-in page
      if (router) {
        router.replace('/(auth)/sign-in');
      }
    } catch (error) {
      console.error('Sign out error:', error);
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
