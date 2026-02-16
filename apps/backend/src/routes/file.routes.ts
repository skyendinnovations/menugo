import { Router } from "express";
import { fileController } from "../controllers/file.controller";
import { uploadSingle } from "../middlewares/upload.middleware";

const router = Router();

// Upload a file (multipart form-data)
router.post(
  "/upload",
  uploadSingle("file"),
  fileController.upload.bind(fileController),
);

// Delete a file
router.delete("/:fileId", fileController.deleteFile.bind(fileController));

// Get files for an entity
router.get(
  "/entity/:entityType/:entityId",
  fileController.getByEntity.bind(fileController),
);

export default router;
