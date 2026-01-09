import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

class BaseAPI {
    protected baseURL = process.env.EXPO_PUBLIC_API_URL;

    protected async getAuthToken(): Promise<string | null> {
        console.log(`[${Platform.OS}] Getting auth token...`);
        
        try {
            // Web platform - use localStorage
            if (Platform.OS === 'web') {
                if (typeof window !== 'undefined' && window.localStorage) {
                    const token = localStorage.getItem('menugo_token');
                    console.log(`[${Platform.OS}] Token from localStorage:`, !!token);
                    return token;
                }
                return null;
            }

            // Mobile platforms (iOS/Android) - use SecureStore
            try {
                // Use the synchronous method which is more reliable on mobile
                const token = SecureStore.getItem('menugo_token');
                console.log(`[${Platform.OS}] Token from SecureStore (sync):`, !!token);
                if (token) {
                    return token;
                }
            } catch (syncError) {
                // Fallback to async method if sync fails
                console.log(`[${Platform.OS}] Sync method failed, trying async:`, syncError);
                const token = await SecureStore.getItemAsync('menugo_token');
                console.log(`[${Platform.OS}] Token from SecureStore (async):`, !!token);
                if (token) return token;
            }
            
            // If no token found, try to get from better-auth session
            console.log(`[${Platform.OS}] No token in SecureStore, checking better-auth session...`);
            try {
                const { authClient } = await import('../auth-client');
                const session = await authClient.getSession();
                console.log(`[${Platform.OS}] Better-auth session:`, JSON.stringify(session.data, null, 2));
                
                if (session.data?.session?.token) {
                    console.log(`[${Platform.OS}] Found token in better-auth session, saving it...`);
                    await SecureStore.setItemAsync('menugo_token', session.data.session.token);
                    return session.data.session.token;
                }
            } catch (authError) {
                console.error(`[${Platform.OS}] Error getting better-auth session:`, authError);
            }
            
            console.warn(`[${Platform.OS}] No token found anywhere`);
            return null;
        } catch (error) {
            console.error(`[${Platform.OS}] Failed to get auth token:`, error);
            return null;
        }
    }

    protected async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        // Get the auth token
        const token = await this.getAuthToken();

        // Log token status for debugging
        console.log(`[${Platform.OS}] Making request to ${endpoint}, token present: ${!!token}`);

        // Build headers that match backend expectations
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        // Add authorization header if token exists
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            console.log(`[${Platform.OS}] Authorization header added`);
        } else {
            console.warn(`[${Platform.OS}] No token available for ${endpoint}`);
        }

        // Merge with any custom headers from options
        if (options.headers) {
            Object.assign(headers, options.headers);
        }

        const config: RequestInit = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error(`[${Platform.OS}] API Error (${response.status}):`, errorData);
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[${Platform.OS}] API request failed for ${endpoint}:`, error);
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

    protected async delete<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export default BaseAPI;