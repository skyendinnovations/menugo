import { Router } from "express";
import { menuController } from "../controllers/menu.controller";
import { kitchenController } from "../controllers/kitchen.controller";
import { requirePermission, requireAnyPermission } from "../middlewares/permission.middleware";

const router = Router({ mergeParams: true });

// --- Categories ---
router.get(
  "/categories",
  requireAnyPermission("manage_menu", "create_orders", "view_orders"),
  menuController.getCategories.bind(menuController),
);

router.post(
  "/categories",
  requirePermission("manage_menu"),
  menuController.createCategory.bind(menuController),
);

router.put(
  "/categories/:categoryId",
  requirePermission("manage_menu"),
  menuController.updateCategory.bind(menuController),
);

router.delete(
  "/categories/:categoryId",
  requirePermission("manage_menu"),
  menuController.deleteCategory.bind(menuController),
);

// --- Items ---
router.get(
  "/categories/:categoryId/items",
  requireAnyPermission("manage_menu", "create_orders", "view_orders"),
  menuController.getItems.bind(menuController),
);

router.get(
  "/items/:itemId",
  requireAnyPermission("manage_menu", "create_orders", "view_orders"),
  menuController.getItem.bind(menuController),
);

router.post(
  "/items",
  requirePermission("manage_menu"),
  menuController.createItem.bind(menuController),
);

router.put(
  "/items/:itemId",
  requirePermission("manage_menu"),
  menuController.updateItem.bind(menuController),
);

router.patch(
  "/items/:itemId/availability",
  requirePermission("manage_menu"),
  menuController.toggleAvailability.bind(menuController),
);

router.delete(
  "/items/:itemId",
  requirePermission("manage_menu"),
  menuController.deleteItem.bind(menuController),
);

// --- Variants ---
router.post(
  "/items/:itemId/variants",
  requirePermission("manage_menu"),
  menuController.createVariant.bind(menuController),
);

router.put(
  "/variants/:variantId",
  requirePermission("manage_menu"),
  menuController.updateVariant.bind(menuController),
);

router.delete(
  "/variants/:variantId",
  requirePermission("manage_menu"),
  menuController.deleteVariant.bind(menuController),
);


// --- Kitchens ---
router.get("/kitchens", requireAnyPermission("manage_menu", "view_orders"), kitchenController.list.bind(kitchenController));
router.post("/kitchens", requirePermission("manage_menu"), kitchenController.create.bind(kitchenController));
router.put("/kitchens/:kitchenId", requirePermission("manage_menu"), kitchenController.update.bind(kitchenController));
router.delete("/kitchens/:kitchenId", requirePermission("manage_menu"), kitchenController.delete.bind(kitchenController));
router.post("/kitchens/:kitchenId/members", requirePermission("manage_menu"), kitchenController.addMember.bind(kitchenController));
router.delete("/kitchens/:kitchenId/members/:userId", requirePermission("manage_menu"), kitchenController.removeMember.bind(kitchenController));

export default router;
