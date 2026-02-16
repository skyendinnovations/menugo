export interface FileRecord {
    id: number;
    key: string;
    url: string;
    originalName: string | null;
    mimeType: string;
    size: number;
    uploadedBy: string | null;
    entityType: string;
    entityId: string;
    purpose: string | null;
    createdAt: string | null;
}

export type EntityType = "restaurant" | "menu_item" | "user";
