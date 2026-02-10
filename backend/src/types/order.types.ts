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
