import { Router } from "express";
import { adminController } from "../controllers/admin.controller";
import { requireSuperAdmin } from "../middlewares/super-admin.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  adminRestaurantIdParams,
  adminUserIdParams,
  suspendRestaurantBody,
  activateRestaurantBody,
  adminBanUserBody,
  adminUnbanUserBody,
} from "../validations";

const router = Router();

// All admin routes require super admin access
router.use(requireSuperAdmin);

// ─── Platform stats ─────────────────────────────────────────────────

router.get(
  "/stats",
  adminController.getPlatformStats.bind(adminController),
);

// ─── Restaurant management ──────────────────────────────────────────

router.get(
  "/restaurants",
  adminController.listRestaurants.bind(adminController),
);

router.get(
  "/restaurants/:id",
  validate({ params: adminRestaurantIdParams }),
  adminController.getRestaurant.bind(adminController),
);

router.put(
  "/restaurants/:id/suspend",
  validate({ params: adminRestaurantIdParams, body: suspendRestaurantBody }),
  adminController.suspendRestaurant.bind(adminController),
);

router.put(
  "/restaurants/:id/activate",
  validate({ params: adminRestaurantIdParams, body: activateRestaurantBody }),
  adminController.activateRestaurant.bind(adminController),
);

// ─── User management ────────────────────────────────────────────────

router.get(
  "/users",
  adminController.listUsers.bind(adminController),
);

router.get(
  "/users/:id",
  validate({ params: adminUserIdParams }),
  adminController.getUser.bind(adminController),
);

router.put(
  "/users/:id/ban",
  validate({ params: adminUserIdParams, body: adminBanUserBody }),
  adminController.banUser.bind(adminController),
);

router.put(
  "/users/:id/unban",
  validate({ params: adminUserIdParams, body: adminUnbanUserBody }),
  adminController.unbanUser.bind(adminController),
);

export default router;
