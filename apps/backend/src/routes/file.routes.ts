import { Router } from "express";
import { fileController } from "../controllers/file.controller";
import { uploadSingle } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate.middleware";
import { fileIdParams, entityParams, uploadFileBody } from "../validations";

const router = Router();

// Upload a file (multipart form-data)
router.post(
  "/upload",
  uploadSingle("file"),
  validate({ body: uploadFileBody }),
  fileController.upload.bind(fileController),
);

// Delete a file
router.delete(
  "/:fileId",
  validate({ params: fileIdParams }),
  fileController.deleteFile.bind(fileController),
);

// Get files for an entity
router.get(
  "/entity/:entityType/:entityId",
  validate({ params: entityParams }),
  fileController.getByEntity.bind(fileController),
);

export default router;
