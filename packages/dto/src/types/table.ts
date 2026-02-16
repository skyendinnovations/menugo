export interface Table {
    id: number;
    restaurantId: number;
    tableNumber: number;
    qrCode?: string;
    capacity: number;
    isActive?: boolean;
    updatedAt?: string;
}

export interface QRData {
    url: string;
    qrDataUrl: string;
    tableNumber: number;
}

export interface CreateTableDTO {
    tableNumber: number;
    capacity?: number;
}

export interface BulkCreateTablesDTO {
    from: number;
    to: number;
    capacity?: number;
}

export interface UpdateTableDTO {
    capacity?: number;
    isActive?: boolean;
}
