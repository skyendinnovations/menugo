import type { Request, Response, NextFunction } from "express";
import { fileService } from "../services/file.service";

class FileController {
    async upload(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: "Not authenticated" });
            }

            if (!req.file) {
                return res.status(400).json({ success: false, message: "No file provided" });
            }

            const { entityType, entityId, purpose } = req.body;
            if (!entityType || !entityId) {
                return res.status(400).json({
                    success: false,
                    message: "entityType and entityId are required",
                });
            }

            const validTypes = ["restaurant", "menu_item", "user"];
            if (!validTypes.includes(entityType)) {
                return res.status(400).json({
                    success: false,
                    message: `entityType must be one of: ${validTypes.join(", ")}`,
                });
            }

            const file = await fileService.uploadFile({
                file: req.file,
                entityType,
                entityId: String(entityId),
                purpose: purpose || "image",
                uploadedBy: userId,
            });

            return res.status(201).json({
                success: true,
                message: "File uploaded successfully",
                data: file,
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteFile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ success: false, message: "Not authenticated" });
            }

            const { fileId } = req.params;
            if (!fileId || !/^\d+$/.test(fileId)) {
                return res.status(400).json({ success: false, message: "Invalid file ID" });
            }

            const file = await fileService.deleteFile(Number(fileId));

            return res.status(200).json({
                success: true,
                message: "File deleted successfully",
                data: file,
            });
        } catch (error) {
            next(error);
        }
    }

    async getByEntity(req: Request, res: Response, next: NextFunction) {
        try {
            const { entityType, entityId } = req.params;
            if (!entityType || !entityId) {
                return res.status(400).json({ success: false, message: "Invalid params" });
            }

            const files = await fileService.getFilesByEntity(entityType, entityId);

            return res.status(200).json({
                success: true,
                data: files,
            });
        } catch (error) {
            next(error);
        }
    }

    async stream(req: Request, res: Response, next: NextFunction) {
        try {
            const { fileId } = req.params;
            if (!fileId || !/^\d+$/.test(fileId)) {
                return res.status(400).json({ success: false, message: "Invalid file ID" });
            }

            const { stream, contentType, contentLength, fileName } =
                await fileService.streamFile(Number(fileId));

            res.setHeader("Content-Type", contentType);
            if (contentLength) {
                res.setHeader("Content-Length", contentLength);
            }
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            res.setHeader(
                "Content-Disposition",
                `inline; filename="${fileName}"`
            );

            stream.pipe(res);
        } catch (error) {
            next(error);
        }
    }
}

export const fileController = new FileController();
