import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "menugo_session";
const TOKEN_KEY = "menugo_token";

// Cross-platform storage helpers
const storage = {
    getItem: (key: string): string | null => {
        if (Platform.OS === "web") {
            return typeof window !== "undefined" ? localStorage.getItem(key) : null;
        }
        return SecureStore.getItem(key);
    },
    setItem: (key: string, value: string): void => {
        if (Platform.OS === "web") {
            if (typeof window !== "undefined") {
                localStorage.setItem(key, value);
            }
        } else {
            SecureStore.setItem(key, value);
        }
    },
    deleteItem: (key: string): void => {
        if (Platform.OS === "web") {
            if (typeof window !== "undefined") {
                localStorage.removeItem(key);
            }
        } else {
            SecureStore.deleteItemAsync(key);
        }
    },
};

// Manual session management
const sessionManager = {
    saveSession: (data: { user: any; token?: string | null }) => {
        if (data.user) {
            storage.setItem(SESSION_KEY, JSON.stringify(data.user));
        }
        if (data.token) {
            storage.setItem(TOKEN_KEY, data.token);
        }
    },
    getStoredSession: (): { user: any; token: string | null } | null => {
        const userStr = storage.getItem(SESSION_KEY);
        const token = storage.getItem(TOKEN_KEY);
        if (userStr) {
            try {
                return { user: JSON.parse(userStr), token };
            } catch {
                return null;
            }
        }
        return null;
    },
    clearSession: () => {
        storage.deleteItem(SESSION_KEY);
        storage.deleteItem(TOKEN_KEY);
    },
    getToken: (): string | null => {
        return storage.getItem(TOKEN_KEY);
    },
};

// Create a storage adapter for native platforms
const nativeStorage = {
    getItem: (key: string): string | null => {
        return SecureStore.getItem(key);
    },
    setItem: (key: string, value: string): void => {
        SecureStore.setItem(key, value);
    },
    deleteItem: (key: string): void => {
        SecureStore.deleteItemAsync(key);
    },
};

// Only use expoClient plugin on native platforms
const plugins = Platform.OS !== "web"
    ? [
        expoClient({
            scheme: "menugo",
            storage: nativeStorage,
        })
    ]
    : [];

export const authClient = createAuthClient({
    baseURL: process.env.EXPO_PUBLIC_API_URL,
    plugins,
    fetchOptions: {
        credentials: "include",
    },
});

// Override signIn to also save session manually
const originalSignIn = authClient.signIn;
export const signIn = {
    ...originalSignIn,
    email: async (params: { email: string; password: string }) => {
        const result = await originalSignIn.email(params);
        if (result.data?.user) {
            sessionManager.saveSession({
                user: result.data.user,
                token: result.data.token,
            });
        }
        return result;
    },
};

// Override signUp to also save session manually
const originalSignUp = authClient.signUp;
export const signUp = {
    ...originalSignUp,
    email: async (params: { email: string; password: string; name: string; role?: string }) => {
        const result = await originalSignUp.email(params);
        if (result.data?.user) {
            sessionManager.saveSession({
                user: result.data.user,
                token: result.data.token,
            });
        }
        return result;
    },
};

// Override signOut to clear manual session
export const signOut = async () => {
    sessionManager.clearSession();
    return authClient.signOut();
};

// Override getSession to use manual storage as fallback
export const getSession = async () => {
    const result = await authClient.getSession();
    if (result.data?.user) {
        return result;
    }
    // Fallback to manual storage
    const stored = sessionManager.getStoredSession();
    if (stored) {
        return { data: { user: stored.user, session: stored }, error: null };
    }
    return result;
};

export const { useSession, $Infer } = authClient;
export { sessionManager, storage };
