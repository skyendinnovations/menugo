/**
 * Trigger events are now dynamic — they are derived from the active
 * workflow transitions for a restaurant. The format is:
 *   "order_placed" | "order_cancelled" | "status_<from>_to_<to>"
 */
export type NotificationTriggerEvent = string;

/**
 * Well-known trigger event labels. Dynamic trigger events that don't
 * appear here will get an auto-generated label via `getTriggerEventLabel()`.
 */
export const TRIGGER_EVENT_LABELS: Record<string, string> = {
    order_placed: "New Order Placed",
    status_received_to_preparing: "Order Started Preparing",
    status_preparing_to_ready: "Order Ready",
    status_ready_to_served: "Order Served",
    status_received_to_served: "Order Served",
    status_served_to_paid: "Order Paid",
    order_cancelled: "Order Cancelled",
};

/**
 * Get a human-readable label for any trigger event, including dynamic ones.
 */
export function getTriggerEventLabel(event: string): string {
    if (TRIGGER_EVENT_LABELS[event]) return TRIGGER_EVENT_LABELS[event];

    // Auto-generate from pattern: status_<from>_to_<to>
    const match = event.match(/^status_(\w+)_to_(\w+)$/);
    if (match) {
        const to = match[2];
        const capitalised = to.charAt(0).toUpperCase() + to.slice(1);
        return `Order ${capitalised}`;
    }

    return event;
}

export interface NotificationSetting {
    id: number;
    restaurantId: number;
    triggerEvent: string;
    roleId: number;
    roleName?: string;
    enabled: boolean;
}

export interface NotificationSettingsMatrix {
    triggerEvent: string;
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
