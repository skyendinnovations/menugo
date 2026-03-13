import { Router } from "express";
import { tableController } from "../controllers/table.controller";
import { requirePermission, requireAnyPermission } from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  tableParams,
  tableIdParams,
  createTableBody,
  bulkCreateTablesBody,
  updateTableBody,
  forceReleaseBody,
} from "../validations";

const router = Router({ mergeParams: true });

router.get(
  "/",
  validate({ params: tableParams }),
  requireAnyPermission("manage_tables", "helper_block_table", "table_force_release"),
  tableController.getTables.bind(tableController),
);

router.post(
  "/",
  validate({ params: tableParams, body: createTableBody }),
  requirePermission("manage_tables"),
  tableController.createTable.bind(tableController),
);

router.post(
  "/bulk",
  validate({ params: tableParams, body: bulkCreateTablesBody }),
  requirePermission("manage_tables"),
  tableController.bulkCreateTables.bind(tableController),
);

router.put(
  "/:tableId",
  validate({ params: tableIdParams, body: updateTableBody }),
  requirePermission("manage_tables"),
  tableController.updateTable.bind(tableController),
);

router.delete(
  "/:tableId",
  validate({ params: tableIdParams }),
  requirePermission("manage_tables"),
  tableController.deleteTable.bind(tableController),
);

router.get(
  "/:tableId/qr",
  validate({ params: tableIdParams }),
  requirePermission("manage_tables"),
  tableController.getTableQR.bind(tableController),
);

// ─── Helper Soft-Block ────────────────────────────────────────────

router.post(
  "/:tableId/block",
  validate({ params: tableIdParams }),
  requirePermission("helper_block_table"),
  tableController.blockTable.bind(tableController),
);

router.post(
  "/:tableId/unblock",
  validate({ params: tableIdParams }),
  requirePermission("helper_block_table"),
  tableController.unblockTable.bind(tableController),
);

// ─── Force Release ────────────────────────────────────────────────

router.post(
  "/:tableId/force-release",
  validate({ params: tableIdParams, body: forceReleaseBody }),
  requirePermission("table_force_release"),
  tableController.forceReleaseTable.bind(tableController),
);

export default router;
