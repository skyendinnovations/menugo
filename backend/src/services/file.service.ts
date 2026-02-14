import { eq } from "drizzle-orm";
import { db } from "../db";
import { restaurants, menuItems, files } from "../db/schemas";
import { user } from "../db/schemas/auth.schema";
import { fileRepository } from "../repositories/file.repository";
import { getStorageProvider } from "../storage";
import { config } from "../config";
import { AppError } from "../types";
import type { UploadFileDTO } from "../types/file.types";

class FileService {
    async uploadFile(dto: UploadFileDTO) {
        const { file, entityType, entityId, purpose = "image", uploadedBy } = dto;

        // Validate mime type
        if (!config.storage.allowedMimeTypes.includes(file.mimetype as any)) {
            throw new AppError(400, `File type ${file.mimetype} is not allowed`);
        }

        // Validate file size
        if (file.size > config.storage.maxFileSize) {
            throw new AppError(400, `File size exceeds maximum of ${config.storage.maxFileSize / (1024 * 1024)}MB`);
        }

        // Generate storage key
        const ext = file.originalname.split(".").pop() || "jpg";
        const timestamp = Date.now();
        const key = await this.buildStorageKey(entityType, entityId, purpose, timestamp, ext);

        const storage = getStorageProvider();

        // Delete old file for the same entity+purpose (auto-cleanup on re-upload)
        const existingFile = await fileRepository.findByEntityAndPurpose(entityType, entityId, purpose);
        if (existingFile) {
            try {
                await storage.delete(existingFile.key);
            } catch {
                // Ignore delete errors for old files
            }
            await fileRepository.deleteById(existingFile.id);
        }

        // Upload to storage
        await storage.upload({
            key,
            body: file.buffer,
            contentType: file.mimetype,
        });

        // Build URL — use stream endpoint since public access may not be configured
        const publicUrl = config.storage.r2.publicUrl;
        // We'll set the URL after we know the file ID, so insert first with placeholder
        const fileRecord = await fileRepository.create({
            key,
            url: "", // will be updated below
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploadedBy,
            entityType,
            entityId,
            purpose,
        });

        // Set the final URL (stream endpoint needs the file ID)
        const url = publicUrl
            ? `${publicUrl}/${key}`
            : `/api/files/stream/${fileRecord!.id}`;

        // Update the record with the correct URL
        const [updated] = await db
            .update(files)
            .set({ url })
            .where(eq(files.id, fileRecord!.id))
            .returning();

        // Update parent entity's inline image field
        await this.updateEntityImageField(entityType, entityId, url);

        return updated;
    }

    async deleteFile(fileId: number) {
        const file = await fileRepository.findById(fileId);
        if (!file) {
            throw new AppError(404, "File not found");
        }

        const storage = getStorageProvider();
        try {
            await storage.delete(file.key);
        } catch {
            // Log but don't fail if storage delete fails
        }

        await fileRepository.deleteById(fileId);

        // Clear parent entity's inline image field
        await this.updateEntityImageField(file.entityType, file.entityId, null);

        return file;
    }

    async getFilesByEntity(entityType: string, entityId: string) {
        return fileRepository.findByEntity(entityType, entityId);
    }

    async getFileById(fileId: number) {
        const file = await fileRepository.findById(fileId);
        if (!file) {
            throw new AppError(404, "File not found");
        }
        return file;
    }

    async streamFile(fileId: number) {
        const file = await fileRepository.findById(fileId);
        if (!file) {
            throw new AppError(404, "File not found");
        }

        const storage = getStorageProvider();
        const { stream, contentType, contentLength } = await storage.getStream(file.key);

        return {
            stream,
            contentType: file.mimeType || contentType,
            contentLength,
            fileName: file.originalName || `file-${fileId}`,
        };
    }

    private async buildStorageKey(
        entityType: string,
        entityId: string,
        purpose: string,
        timestamp: number,
        ext: string
    ): Promise<string> {
        const filename = `${purpose}-${timestamp}.${ext}`;

        if (entityType === "restaurant") {
            const [restaurant] = await db
                .select({ slug: restaurants.slug })
                .from(restaurants)
                .where(eq(restaurants.id, Number(entityId)))
                .limit(1);
            const slug = restaurant?.slug || entityId;
            return `restaurants/${slug}/${filename}`;
        }

        if (entityType === "menu_item") {
            const [item] = await db
                .select({ restaurantId: menuItems.restaurantId })
                .from(menuItems)
                .where(eq(menuItems.id, Number(entityId)))
                .limit(1);
            if (item?.restaurantId) {
                const [restaurant] = await db
                    .select({ slug: restaurants.slug })
                    .from(restaurants)
                    .where(eq(restaurants.id, item.restaurantId))
                    .limit(1);
                const slug = restaurant?.slug || String(item.restaurantId);
                return `menu-items/${slug}/${entityId}/${filename}`;
            }
            return `menu-items/${entityId}/${filename}`;
        }

        // users and other entity types
        return `${entityType}s/${entityId}/${filename}`;
    }

    private async updateEntityImageField(
        entityType: string,
        entityId: string,
        url: string | null
    ) {
        try {
            if (entityType === "restaurant") {
                await db
                    .update(restaurants)
                    .set({ logo: url })
                    .where(eq(restaurants.id, Number(entityId)));
            } else if (entityType === "menu_item") {
                await db
                    .update(menuItems)
                    .set({ imagePath: url })
                    .where(eq(menuItems.id, Number(entityId)));
            } else if (entityType === "user") {
                await db
                    .update(user)
                    .set({ image: url })
                    .where(eq(user.id, entityId));
            }
        } catch {
            // Non-critical — don't fail the upload if entity update fails
        }
    }
}

export const fileService = new FileService();
