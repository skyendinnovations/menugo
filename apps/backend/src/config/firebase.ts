import admin, { type app, type messaging } from "firebase-admin";
import {
    FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY,
} from "../envs";
import { logger } from "../utils/logger";

let _app: app.App | null = null;

export function getFirebaseApp(): app.App | null {
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
        logger.warn("Firebase credentials not configured — push notifications disabled");
        return null;
    }
    if (!_app) {
        try {
            _app = admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: FIREBASE_PROJECT_ID,
                    clientEmail: FIREBASE_CLIENT_EMAIL,
                    // .env stores \n as literal characters, convert to actual newlines
                    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
                }),
            });
            logger.info("Firebase Admin SDK initialized");
        } catch (error) {
            logger.error("Failed to initialize Firebase Admin SDK", error);
            throw error;
        }
    }
    return _app;
}

export function getMessaging(): messaging.Messaging | null {
    const app = getFirebaseApp();
    if (!app) return null;
    return app.messaging();
}
