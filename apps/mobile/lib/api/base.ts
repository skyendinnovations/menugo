import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { sessionManager } from '@/lib/auth-client';
import { API_URL } from '@/lib/api-url';

/**
 * Thrown by BaseAPI when the server returns HTTP 403.
 * Callers can use `instanceof PermissionError` to show a specific
 * "no permission" message instead of a generic error alert.
 */
export class PermissionError extends Error {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message);
    this.name = 'PermissionError';
  }
}

class BaseAPI {
  protected baseURL = API_URL;

  protected async getAuthToken(): Promise<string | null> {
    try {
      // On web, SecureStore native module is not available - use localStorage directly
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage.getItem('menugo_token');
        }
        return null;
      }

      const token = await SecureStore.getItemAsync('menugo_token');
      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);

      // Fallback to localStorage if SecureStore fails
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage.getItem('menugo_token');
        }
      } catch (fallbackError) {
        console.error('Fallback storage also failed:', fallbackError);
      }

      return null;
    }
  }

  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    // Get the auth token
    const token = await this.getAuthToken();

    // Build headers that match backend expectations
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Merge with any custom headers from options
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // On 401, clear the stale session so the app redirects to sign-in
        if (response.status === 401) {
          sessionManager.clearSession();
        }

        const message =
          errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        // 7.5 — 403 → typed PermissionError so callers can show a specific message.
        if (response.status === 403) {
          throw new PermissionError(message);
        }

        throw new Error(message);
      }

      return await response.json();
    } catch (error) {
      // AbortError = intentional cancellation by useRealtimeOrders — not a real failure.
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      if (endpoint !== '/api/auth/get-session') {
        console.error(`API request failed for ${endpoint}:`, error);
      }
      throw error;
    }
  }

  protected async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  protected async post<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async put<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async patch<T>(endpoint: string, data?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  protected async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  protected async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = await this.getAuthToken();

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    // Do NOT set Content-Type — let fetch set multipart/form-data with boundary

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 401) {
          sessionManager.clearSession();
        }

        const uploadMessage =
          errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`;
        if (response.status === 403) {
          throw new PermissionError(uploadMessage);
        }

        throw new Error(uploadMessage);
      }

      return await response.json();
    } catch (error) {
      console.error(`API upload failed for ${endpoint}:`, error);
      throw error;
    }
  }
}

export default BaseAPI;
