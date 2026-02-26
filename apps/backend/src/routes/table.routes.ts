import { Router } from "express";
import { tableController } from "../controllers/table.controller";
import { requirePermission } from "../middlewares/permission.middleware";
import { validate } from "../middlewares/validate.middleware";
import {
  tableParams,
  tableIdParams,
  createTableBody,
  bulkCreateTablesBody,
  updateTableBody,
} from "../validations";

const router = Router({ mergeParams: true });

router.get(
  "/",
  validate({ params: tableParams }),
  requirePermission("manage_tables"),
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

export default router;
