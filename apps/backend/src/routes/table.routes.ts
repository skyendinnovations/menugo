import { Router } from "express";
import { tableController } from "../controllers/table.controller";
import { requirePermission, requireAnyPermission } from "../middlewares/permission.middleware";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requireAnyPermission("manage_tables", "view_orders", "create_orders", "close_sessions"),
  tableController.getTables.bind(tableController),
);

router.post(
  "/",
  requirePermission("manage_tables"),
  tableController.createTable.bind(tableController),
);

router.post(
  "/bulk",
  requirePermission("manage_tables"),
  tableController.bulkCreateTables.bind(tableController),
);

router.put(
  "/:tableId",
  requirePermission("manage_tables"),
  tableController.updateTable.bind(tableController),
);

router.delete(
  "/:tableId",
  requirePermission("manage_tables"),
  tableController.deleteTable.bind(tableController),
);

router.get(
  "/:tableId/qr",
  requireAnyPermission("manage_tables", "view_orders", "create_orders", "close_sessions"),
  tableController.getTableQR.bind(tableController),
);

export default router;
