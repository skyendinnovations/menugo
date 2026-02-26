import { Router } from "express";
import { menuController } from "../controllers/menu.controller";
import { requirePermission } from "../middlewares/permission.middleware";
import { requireSubscription } from "../middlewares/subscription.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  menuParams,
  categoryIdParams,
  itemIdParams,
  variantIdParams,
  itemVariantParams,
  createCategoryBody,
  updateCategoryBody,
  createItemBody,
  updateItemBody,
  createVariantBody,
  updateVariantBody,
} from "../validations";

const router = Router({ mergeParams: true });

// --- Categories ---
router.get(
  "/categories",
  validate({ params: menuParams }),
  requirePermission("manage_menu"),
  menuController.getCategories.bind(menuController),
);

router.post(
  "/categories",
  validate({ params: menuParams, body: createCategoryBody }),
  requirePermission("manage_menu"),
  menuController.createCategory.bind(menuController),
);

router.put(
  "/categories/:categoryId",
  validate({ params: categoryIdParams, body: updateCategoryBody }),
  requirePermission("manage_menu"),
  menuController.updateCategory.bind(menuController),
);

router.delete(
  "/categories/:categoryId",
  validate({ params: categoryIdParams }),
  requirePermission("manage_menu"),
  menuController.deleteCategory.bind(menuController),
);

// --- Items ---
router.get(
  "/categories/:categoryId/items",
  validate({ params: categoryIdParams }),
  requirePermission("manage_menu"),
  menuController.getItems.bind(menuController),
);

router.get(
  "/items/:itemId",
  validate({ params: itemIdParams }),
  requirePermission("manage_menu"),
  menuController.getItem.bind(menuController),
);

router.post(
  "/items",
  validate({ params: menuParams, body: createItemBody }),
  requirePermission("manage_menu"),
  menuController.createItem.bind(menuController),
);

router.put(
  "/items/:itemId",
  validate({ params: itemIdParams, body: updateItemBody }),
  requirePermission("manage_menu"),
  menuController.updateItem.bind(menuController),
);

router.patch(
  "/items/:itemId/availability",
  validate({ params: itemIdParams }),
  requirePermission("manage_menu"),
  menuController.toggleAvailability.bind(menuController),
);

router.delete(
  "/items/:itemId",
  validate({ params: itemIdParams }),
  requirePermission("manage_menu"),
  menuController.deleteItem.bind(menuController),
);

// --- Variants (require Professional plan) ---
router.post(
  "/items/:itemId/variants",
  validate({ params: itemVariantParams, body: createVariantBody }),
  requireSubscription("professional"),
  requirePermission("manage_menu"),
  menuController.createVariant.bind(menuController),
);

router.put(
  "/variants/:variantId",
  validate({ params: variantIdParams, body: updateVariantBody }),
  requireSubscription("professional"),
  requirePermission("manage_menu"),
  menuController.updateVariant.bind(menuController),
);

router.delete(
  "/variants/:variantId",
  validate({ params: variantIdParams }),
  requireSubscription("professional"),
  requirePermission("manage_menu"),
  menuController.deleteVariant.bind(menuController),
);

export default router;
