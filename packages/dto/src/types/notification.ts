export type NotificationTriggerEvent =
    | "order_placed"
    | "status_received_to_preparing"
    | "status_preparing_to_ready"
    | "status_ready_to_served"
    | "status_served_to_paid"
    | "order_cancelled";

export const ALL_TRIGGER_EVENTS: NotificationTriggerEvent[] = [
    "order_placed",
    "status_received_to_preparing",
    "status_preparing_to_ready",
    "status_ready_to_served",
    "status_served_to_paid",
    "order_cancelled",
];

export const TRIGGER_EVENT_LABELS: Record<NotificationTriggerEvent, string> = {
    order_placed: "New Order Placed",
    status_received_to_preparing: "Order Started Preparing",
    status_preparing_to_ready: "Order Ready",
    status_ready_to_served: "Order Served",
    status_served_to_paid: "Order Paid",
    order_cancelled: "Order Cancelled",
};

export interface NotificationSetting {
    id: number;
    restaurantId: number;
    triggerEvent: NotificationTriggerEvent;
    roleId: number;
    roleName?: string;
    enabled: boolean;
}

export interface NotificationSettingsMatrix {
    triggerEvent: NotificationTriggerEvent;
    label: string;
    roles: Array<{
        roleId: number;
        roleName: string;
        enabled: boolean;
        settingId?: number;
    }>;
}

export interface RegisterDeviceTokenDTO {
    token: string;
    deviceType: "ios" | "android" | "web";
    deviceName?: string;
}

export interface DeviceToken {
    id: number;
    userId: string;
    token: string;
    deviceType: string;
    isActive: boolean;
}

export interface OrderNotificationPayload {
    type: "order_placed" | "order_status_changed" | "order_accepted";
    orderId: number;
    orderNumber: string;
    restaurantId: number;
    restaurantName?: string;
    tableNumber?: number;
    fromStatus?: string;
    toStatus?: string;
    acceptedByName?: string;
}

export interface NotificationLogEntry {
    id: number;
    restaurantId: number;
    orderId?: number | null;
    eventType: string;
    recipientRoleIds: number[];
    recipientUserIds: string[];
    fcmSuccessCount: number;
    fcmFailureCount: number;
    payload: Record<string, unknown>;
    sentAt?: string | null;
}

export interface NotificationLogFilters {
    orderId?: number;
    eventType?: string;
    page?: number;
    limit?: number;
}
