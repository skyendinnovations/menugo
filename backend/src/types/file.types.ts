import type { files } from "../db/schemas/file.schema";

export type FileRecord = typeof files.$inferSelect;

export interface UploadFileDTO {
    file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
        size: number;
    };
    entityType: "restaurant" | "menu_item" | "user";
    entityId: string;
    purpose?: string;
    uploadedBy: string;
}
