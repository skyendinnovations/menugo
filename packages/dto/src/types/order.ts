export interface Order {
    id: number;
    restaurantId: number;
    tableSessionId: number;
    orderNumber: string;
    status: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    items: OrderItem[];
    tableNumber?: number;
}

export interface OrderItem {
    id: number;
    orderId: number;
    menuItemId: number;
    itemName: string;
    variantName?: string;
    priceAtOrder: string;
    quantity: number;
    notes?: string;
    status?: string;
}

export interface CreateOrderDTO {
    sessionId: number;
    deviceId: string;
    notes?: string;
    items: CreateOrderItemDTO[];
}

export interface CreateOrderItemDTO {
    menuItemId: number;
    variantName?: string;
    quantity: number;
    notes?: string;
}

export type OrderStatusUpdate =
    | "received"
    | "preparing"
    | "ready"
    | "served"
    | "paid"
    | "cancelled";
