import { createAuthClient } from "better-auth/react";
import { expoClient } from "@better-auth/expo/client";
import * as SecureStore from "expo-secure-store";

export const authClient = createAuthClient({
    baseURL: process.env.EXPO_PUBLIC_API_URL, // Your Express server URL
    plugins: [
        expoClient({
            scheme: "menugo",
            storage: SecureStore,
        })
    ]
});

export const { useSession, signIn, signUp, signOut } = authClient;
