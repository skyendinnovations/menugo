import { Router } from "express";
import { tableController } from "../controllers/table.controller";
import { requirePermission } from "../middlewares/permission.middleware";

const router = Router({ mergeParams: true });

router.get(
  "/",
  requirePermission("manage_tables"),
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
  requirePermission("manage_tables"),
  tableController.getTableQR.bind(tableController),
);

export default router;
