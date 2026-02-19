import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SESSION_KEY = "menugo_session";
const TOKEN_KEY = "menugo_token";

const storage = {
    getItem: (key: string): string | null => {
        if (Platform.OS === "web") {
            return typeof window !== "undefined"
                ? localStorage.getItem(key)
                : null;
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

export interface MobileAuthClientConfig {
    baseURL: string;
    scheme: string;
}

export function createMobileAuthClient(config: MobileAuthClientConfig) {
    const plugins =
        Platform.OS !== "web"
            ? [
                  expoClient({
                      scheme: config.scheme,
                      storage: nativeStorage,
                  }),
              ]
            : [];

    const authClient = createAuthClient({
        baseURL: config.baseURL,
        plugins,
        fetchOptions: {
            credentials: "include",
        },
    });

    const originalSignIn = authClient.signIn;
    const signIn = {
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
        social: async (params: {
            provider: "google";
            callbackURL?: string;
            idToken?: {
                token: string;
                accessToken?: string;
            };
        }) => {
            const result = await originalSignIn.social(params);
            // On native, the expo plugin handles the redirect flow.
            // On web, the browser redirects so this code may not run
            // immediately, but after redirect the session is picked up
            // automatically via cookies.
            if (result?.data?.user) {
                sessionManager.saveSession({
                    user: result.data.user,
                    token: (result.data as any).token,
                });
            }
            return result;
        },
    };

    const originalSignUp = authClient.signUp;
    const signUp = {
        ...originalSignUp,
        email: async (params: {
            email: string;
            password: string;
            name: string;
            role?: string;
        }) => {
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

    const signOut = async () => {
        sessionManager.clearSession();
        return authClient.signOut();
    };

    const getSession = async () => {
        const result = await authClient.getSession();
        if (result.data?.user) {
            return result;
        }
        const stored = sessionManager.getStoredSession();
        if (stored) {
            return {
                data: { user: stored.user, session: stored },
                error: null,
            };
        }
        return result;
    };

    const { useSession, $Infer } = authClient;

    return {
        authClient,
        signIn,
        signUp,
        signOut,
        getSession,
        useSession,
        $Infer,
    };
}

export { sessionManager, storage };
