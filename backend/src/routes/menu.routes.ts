import { Router } from "express";
import { menuController } from "../controllers/menu.controller";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router({ mergeParams: true });

// --- Categories ---
router.get(
  "/categories",
  requirePermission("manage_menu"),
  menuController.getCategories.bind(menuController)
);

router.post(
  "/categories",
  requirePermission("manage_menu"),
  menuController.createCategory.bind(menuController)
);

router.put(
  "/categories/:categoryId",
  requirePermission("manage_menu"),
  menuController.updateCategory.bind(menuController)
);

router.delete(
  "/categories/:categoryId",
  requirePermission("manage_menu"),
  menuController.deleteCategory.bind(menuController)
);

// --- Items ---
router.get(
  "/categories/:categoryId/items",
  requirePermission("manage_menu"),
  menuController.getItems.bind(menuController)
);

router.get(
  "/items/:itemId",
  requirePermission("manage_menu"),
  menuController.getItem.bind(menuController)
);

router.post(
  "/items",
  requirePermission("manage_menu"),
  menuController.createItem.bind(menuController)
);

router.put(
  "/items/:itemId",
  requirePermission("manage_menu"),
  menuController.updateItem.bind(menuController)
);

router.patch(
  "/items/:itemId/availability",
  requirePermission("manage_menu"),
  menuController.toggleAvailability.bind(menuController)
);

router.delete(
  "/items/:itemId",
  requirePermission("manage_menu"),
  menuController.deleteItem.bind(menuController)
);

// --- Variants ---
router.post(
  "/items/:itemId/variants",
  requirePermission("manage_menu"),
  menuController.createVariant.bind(menuController)
);

router.put(
  "/variants/:variantId",
  requirePermission("manage_menu"),
  menuController.updateVariant.bind(menuController)
);

router.delete(
  "/variants/:variantId",
  requirePermission("manage_menu"),
  menuController.deleteVariant.bind(menuController)
);

export default router;
