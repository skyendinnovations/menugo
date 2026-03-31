import { getMessaging } from "../config/firebase";
import { deviceTokenRepository } from "../repositories/device-token.repository";
import { customerDeviceTokenRepository } from "../repositories/customer-device-token.repository";
import { notificationSettingsRepository } from "../repositories/notification-settings.repository";
import { logger } from "../utils/logger";
import { eq, inArray, and } from "drizzle-orm";
import { db } from "@menugo/data";
import {
    userRoles,
    roles,
    restaurantMembers,
    deviceTokens,
    sessionParticipants,
} from "@menugo/data/schemas";
import type {
    NotificationTriggerEvent,
    OrderNotificationPayload,
    NotificationSettingsMatrix,
    CustomerNotificationPayload,
} from "@menugo/dto";
import { ALL_TRIGGER_EVENTS, TRIGGER_EVENT_LABELS } from "@menugo/dto";

class NotificationService {
    // ─── Device Token Management ───────────────────────────────────────────────

    async registerToken(userId: string, token: string, deviceType: string, deviceName?: string) {
        return deviceTokenRepository.upsert(userId, token, deviceType, deviceName);
    }

    async unregisterToken(token: string) {
        return deviceTokenRepository.deactivate(token);
    }

    async registerCustomerToken(deviceId: string, token: string, deviceType: string) {
        return customerDeviceTokenRepository.upsert(deviceId, token, deviceType);
    }

    // ─── Settings Management ───────────────────────────────────────────────────

    async getSettingsMatrix(restaurantId: number): Promise<NotificationSettingsMatrix[]> {
        const restaurantRoles = await db
            .select({ id: roles.id, name: roles.name })
            .from(roles)
            .where(eq(roles.restaurantId, restaurantId));

        const settings = await notificationSettingsRepository.findByRestaurant(restaurantId);

        return ALL_TRIGGER_EVENTS.map((event) => ({
            triggerEvent: event,
            label: TRIGGER_EVENT_LABELS[event],
            roles: restaurantRoles.map((role) => {
                const setting = settings.find(
                    (s) => s.triggerEvent === event && s.roleId === role.id
                );
                return {
                    roleId: role.id,
                    roleName: role.name,
                    enabled: setting?.enabled ?? false,
                    settingId: setting?.id,
                };
            }),
        }));
    }

    async updateSettings(
        restaurantId: number,
        settings: Array<{ triggerEvent: string; roleId: number; enabled: boolean }>
    ) {
        return notificationSettingsRepository.bulkUpsert(restaurantId, settings);
    }

    async seedDefaults(restaurantId: number) {
        return notificationSettingsRepository.seedDefaults(restaurantId);
    }

    // ─── Order Notifications → All Enabled Staff ───────────────────────────────

    /**
     * Sends an order-level event (e.g. order_placed) to ALL staff
     * who have that event enabled in their notification settings.
     */
    async sendOrderNotification(
        restaurantId: number,
        triggerEvent: NotificationTriggerEvent,
        payload: OrderNotificationPayload
    ) {
        try {
            const enabledRoles = await notificationSettingsRepository.findEnabledByEvent(
                restaurantId,
                triggerEvent
            );

            if (enabledRoles.length === 0) {
                logger.debug(`No notification settings for event ${triggerEvent}`);
                return;
            }

            const roleIds = enabledRoles.map((r) => r.roleId);

            const usersWithRoles = await db
                .select({ userId: userRoles.userId })
                .from(userRoles)
                .where(and(eq(userRoles.restaurantId, restaurantId), inArray(userRoles.roleId, roleIds)));

            const owners = await db
                .select({ userId: restaurantMembers.userId })
                .from(restaurantMembers)
                .where(and(eq(restaurantMembers.restaurantId, restaurantId), eq(restaurantMembers.isOwner, true)));

            const ownerRole = enabledRoles.find((r) => r.roleName.toLowerCase() === "owner");

            const userIds = [
                ...new Set([
                    ...usersWithRoles.map((u) => u.userId),
                    ...(ownerRole ? owners.map((o) => o.userId) : []),
                ]),
            ];

            if (userIds.length === 0) return;

            const tokens = await deviceTokenRepository.findByUsers(userIds);
            if (tokens.length === 0) return;

            const { title, body } = this.buildOrderNotificationContent(triggerEvent, payload);
            await this.sendMulticast(
                tokens.map((t) => t.token),
                title,
                body,
                this.serializePayload(payload)
            );

            logger.info(
                `Sent '${triggerEvent}' notification to ${tokens.length} devices for order #${payload.orderNumber}`
            );
        } catch (error) {
            logger.error("Failed to send order notification", error);
        }
    }

    // ─── Item Notifications → Specific Staff Only ──────────────────────────────

    /**
     * Notifies only the staff assigned to an item (kitchen acceptor and/or waiter
     * acceptor). Falls back to all enabled staff if no one has claimed the item yet.
     */
    async sendItemNotification(
        restaurantId: number,
        triggerEvent: NotificationTriggerEvent,
        payload: OrderNotificationPayload,
        kitchenAcceptorId: string | null,
        waiterAcceptorId: string | null
    ) {
        try {
            const assignedUserIds = [
                ...(kitchenAcceptorId ? [kitchenAcceptorId] : []),
                ...(waiterAcceptorId ? [waiterAcceptorId] : []),
            ];

            let targetUserIds: string[] = [];

            if (assignedUserIds.length > 0) {
                // Targeted: only notify the staff who claimed the item
                targetUserIds = [...new Set(assignedUserIds)];
            } else {
                // Fallback: notify all enabled staff (item hasn't been claimed yet)
                const enabledRoles = await notificationSettingsRepository.findEnabledByEvent(
                    restaurantId,
                    triggerEvent
                );
                if (enabledRoles.length === 0) return;

                const roleIds = enabledRoles.map((r) => r.roleId);
                const usersWithRoles = await db
                    .select({ userId: userRoles.userId })
                    .from(userRoles)
                    .where(and(eq(userRoles.restaurantId, restaurantId), inArray(userRoles.roleId, roleIds)));

                targetUserIds = [...new Set(usersWithRoles.map((u) => u.userId))];
            }

            if (targetUserIds.length === 0) return;

            const tokens = await deviceTokenRepository.findByUsers(targetUserIds);
            if (tokens.length === 0) return;

            const { title, body } = this.buildOrderNotificationContent(triggerEvent, payload);
            await this.sendMulticast(
                tokens.map((t) => t.token),
                title,
                body,
                this.serializePayload(payload)
            );

            logger.info(
                `Sent '${triggerEvent}' to ${tokens.length} assigned staff device(s) for item '${payload.itemName}'`
            );
        } catch (error) {
            logger.error("Failed to send item notification", error);
        }
    }

    // ─── Customer Notifications ────────────────────────────────────────────────

    /**
     * Sends a push notification to all customer devices in a session.
     * Customers are identified by deviceId (they are anonymous).
     */
    async sendCustomerNotification(
        sessionId: number,
        payload: CustomerNotificationPayload
    ) {
        try {
            // Get all active participants in the session
            const participants = await db
                .select({ deviceId: sessionParticipants.deviceId })
                .from(sessionParticipants)
                .where(
                    and(
                        eq(sessionParticipants.sessionId, sessionId),
                        eq(sessionParticipants.status, "active")
                    )
                );

            if (participants.length === 0) return;

            const deviceIds = [...new Set(participants.map((p) => p.deviceId))];
            const tokens = await customerDeviceTokenRepository.findByDeviceIds(deviceIds);

            if (tokens.length === 0) {
                logger.debug(`No customer FCM tokens for session ${sessionId}`);
                return;
            }

            const { title, body } = this.buildCustomerNotificationContent(payload);
            await this.sendMulticast(
                tokens.map((t) => t.token),
                title,
                body,
                {
                    type: payload.type,
                    orderId: String(payload.orderId),
                    orderNumber: payload.orderNumber,
                    itemId: payload.itemId ? String(payload.itemId) : "",
                    itemName: payload.itemName || "",
                    itemStatus: payload.itemStatus || "",
                },
                true // isCustomer — lighter notification style
            );

            logger.info(
                `Sent customer notification to ${tokens.length} devices for order #${payload.orderNumber}`
            );
        } catch (error) {
            logger.error("Failed to send customer notification", error);
        }
    }

    // ─── FCM multicast ─────────────────────────────────────────────────────────

    private async sendMulticast(
        tokens: string[],
        title: string,
        body: string,
        data: Record<string, string>,
        isCustomer = false
    ) {
        if (tokens.length === 0) return;

        const messaging = getMessaging();

        const message = {
            tokens,
            notification: { title, body },
            data,
            android: {
                priority: (isCustomer ? "normal" : "high") as "high" | "normal",
                notification: {
                    channelId: isCustomer ? "order-updates" : "orders",
                    sound: "default",
                },
            },
            apns: {
                headers: { "apns-priority": isCustomer ? "5" : "10" },
                payload: { aps: { sound: "default", badge: 1 } },
            },
        };

        const response = await messaging.sendEachForMulticast(message);

        if (response.failureCount > 0) {
            const staleTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (resp.error) {
                    const code = resp.error.code;
                    if (
                        code === "messaging/registration-token-not-registered" ||
                        code === "messaging/invalid-registration-token"
                    ) {
                        const token = tokens[idx];
                        if (token) staleTokens.push(token);
                    } else {
                        logger.warn(`FCM send failed: ${code}`, resp.error.message);
                    }
                }
            });

            if (staleTokens.length > 0) {
                await deviceTokenRepository.deactivateTokens(staleTokens);
            }
        }

        return response;
    }

    // ─── Content builders ──────────────────────────────────────────────────────

    private buildOrderNotificationContent(
        triggerEvent: NotificationTriggerEvent,
        payload: OrderNotificationPayload
    ): { title: string; body: string } {
        const orderRef = `#${payload.orderNumber}`;
        const tableRef = payload.tableNumber ? `Table ${payload.tableNumber}` : "";
        const prefix = tableRef ? `${tableRef} — ` : "";

        switch (triggerEvent) {
            case "order_placed":
                return {
                    title: `🆕 New Order ${orderRef}`,
                    body: `${prefix}New order received`,
                };
            case "item_accepted_kitchen":
                return {
                    title: `👨‍🍳 Item Accepted`,
                    body: `${prefix}Kitchen accepted ${payload.itemName || "an item"}`,
                };
            case "item_status_preparing":
                return {
                    title: `🔥 Preparing ${payload.itemName || "item"}`,
                    body: `${prefix}Order ${orderRef} — item being prepared`,
                };
            case "item_status_ready":
                return {
                    title: `✅ Ready for Pickup`,
                    body: `${prefix}${payload.itemName || "Item"} is ready — Order ${orderRef}`,
                };
            case "item_status_served":
                return {
                    title: `🍽️ Item Served`,
                    body: `${prefix}${payload.itemName || "Item"} served — Order ${orderRef}`,
                };
            case "status_received_to_preparing":
                return {
                    title: `🔥 Order ${orderRef} Preparing`,
                    body: `${prefix}Kitchen started preparing`,
                };
            case "status_preparing_to_ready":
                return {
                    title: `✅ Order ${orderRef} Ready`,
                    body: `${prefix}Ready for pickup`,
                };
            case "status_ready_to_served":
                return {
                    title: `🍽️ Order ${orderRef} Served`,
                    body: `${prefix}Order has been served`,
                };
            case "status_served_to_paid":
                return {
                    title: `💰 Order ${orderRef} Paid`,
                    body: `${prefix}Payment received`,
                };
            case "order_cancelled":
                return {
                    title: `❌ Order ${orderRef} Cancelled`,
                    body: `${prefix}Order was cancelled`,
                };
            default:
                return {
                    title: `Order ${orderRef} Updated`,
                    body: "Order status has changed",
                };
        }
    }

    private buildCustomerNotificationContent(
        payload: CustomerNotificationPayload
    ): { title: string; body: string } {
        const orderRef = `#${payload.orderNumber}`;
        switch (payload.itemStatus) {
            case "preparing":
                return {
                    title: `👨‍🍳 ${payload.itemName || "Your item"} is being prepared`,
                    body: `Order ${orderRef} — hang tight!`,
                };
            case "ready":
                return {
                    title: `🎉 ${payload.itemName || "Your item"} is ready!`,
                    body: `Order ${orderRef} — your food is on the way`,
                };
            case "served":
                return {
                    title: `🍽️ ${payload.itemName || "Your item"} has been served`,
                    body: `Order ${orderRef} — enjoy your meal!`,
                };
            case "cancelled":
                return {
                    title: `❌ ${payload.itemName || "An item"} was cancelled`,
                    body: `Order ${orderRef} — please speak to staff`,
                };
            default:
                return {
                    title: `Order ${orderRef} Updated`,
                    body: payload.message || "Your order status has changed",
                };
        }
    }

    private serializePayload(payload: OrderNotificationPayload): Record<string, string> {
        return {
            type: payload.type,
            orderId: String(payload.orderId),
            orderNumber: payload.orderNumber,
            restaurantId: String(payload.restaurantId),
            tableNumber: payload.tableNumber ? String(payload.tableNumber) : "",
            itemId: payload.itemId ? String(payload.itemId) : "",
            itemName: payload.itemName || "",
            itemStatus: payload.itemStatus || "",
        };
    }
}

export const notificationService = new NotificationService();
