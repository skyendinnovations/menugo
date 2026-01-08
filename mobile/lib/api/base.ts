import SecureStore from 'expo-secure-store';

class BaseAPI {
    protected baseURL = process.env.EXPO_PUBLIC_API_URL;

    protected async getAuthToken(): Promise<string | null> {
        try {
            // Check if SecureStore is available (not available in web)
            if (!SecureStore || typeof SecureStore.getItemAsync !== 'function') {
                console.warn('SecureStore not available, trying localStorage fallback');

                // Fallback to localStorage for web environments
                if (typeof window !== 'undefined' && window.localStorage) {
                    return localStorage.getItem('menugo_auth_token');
                }

                return null;
            }

            const token = await SecureStore.getItemAsync('menugo_auth_token');
            return token;
        } catch (error) {
            console.error('Failed to get auth token:', error);

            // Fallback to localStorage if SecureStore fails
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    return localStorage.getItem('menugo_auth_token');
                }
            } catch (fallbackError) {
                console.error('Fallback storage also failed:', fallbackError);
            }

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

        // Build headers that match backend expectations
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
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
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`API request failed for ${endpoint}:`, error);
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