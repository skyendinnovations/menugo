import { Router } from "express";
import userRoutes from "./user.routes";
import restaurantRoutes from "./restaurant.routes";
import roleRoutes from "./role.routes";
import memberRoutes from "./member.routes";
import tableRoutes from "./table.routes";
import menuRoutes from "./menu.routes";
import sessionRoutes from "./session.routes";
import orderRoutes from "./order.routes";
import publicRoutes from "./public.routes";
import fileRoutes from "./file.routes";
import notificationRoutes from "./notification.routes";
import notificationSettingsRoutes from "./notification-settings.routes";
import { fileController } from "../controllers/file.controller";
import { authenticate } from "../middlewares/auth.middleware";
import {
  FIREBASE_PROJECT_ID,
  FIREBASE_WEB_API_KEY,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_WEB_APP_ID,
} from "../envs";

const router = Router();

// Health check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Public Firebase web config (for service worker)
router.get("/config/firebase", (req, res) => {
  res.json({
    apiKey: FIREBASE_WEB_API_KEY || "",
    authDomain: `${FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: FIREBASE_PROJECT_ID,
    messagingSenderId: FIREBASE_MESSAGING_SENDER_ID || "",
    appId: FIREBASE_WEB_APP_ID || "",
  });
});

// Public file streaming (no auth — so <Image> tags can load directly)
router.get("/files/stream/:fileId", fileController.stream.bind(fileController));

// API routes
router.use("/users", userRoutes);

router.use("/restaurants", authenticate, restaurantRoutes);
router.use("/files", authenticate, fileRoutes);

// Restaurant sub-resources (all authenticated with permission middleware)
router.use("/restaurants/:restaurantId/roles", authenticate, roleRoutes);
router.use("/restaurants/:restaurantId/members", authenticate, memberRoutes);
router.use("/restaurants/:restaurantId/tables", authenticate, tableRoutes);
router.use("/restaurants/:restaurantId/menu", authenticate, menuRoutes);
router.use("/restaurants/:restaurantId/sessions", authenticate, sessionRoutes);
router.use("/restaurants/:restaurantId/orders", authenticate, orderRoutes);
router.use(
  "/restaurants/:restaurantId/notification-settings",
  authenticate,
  notificationSettingsRoutes,
);

// Notification token management (authenticated, not restaurant-scoped)
router.use("/notifications", authenticate, notificationRoutes);

// Accept invitation (authenticated but not restaurant-scoped)
import { memberController } from "../controllers/member.controller";
router.get(
  "/invitations/my",
  authenticate,
  memberController.getMyInvitations.bind(memberController),
);
router.post(
  "/invitations/accept",
  authenticate,
  memberController.acceptInvitation.bind(memberController),
);
router.post(
  "/invitations/reject",
  authenticate,
  memberController.rejectInvitation.bind(memberController),
);

// Public routes (NO auth middleware)
router.use("/public", publicRoutes);

export default router;
