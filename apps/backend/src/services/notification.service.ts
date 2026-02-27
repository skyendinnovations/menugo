import { getMessaging } from "../config/firebase";
import { deviceTokenRepository } from "../repositories/device-token.repository";
import { notificationSettingsRepository } from "../repositories/notification-settings.repository";
import { notificationLogRepository } from "../repositories/notification-log.repository";
import { logger } from "../utils/logger";
import { eq, inArray, and } from "drizzle-orm";
import { db } from "@menugo/data";
import { userRoles, roles, restaurantMembers } from "@menugo/data/schemas";
import { restaurants } from "@menugo/data/schemas";
import type {
    NotificationTriggerEvent,
    OrderNotificationPayload,
    NotificationSettingsMatrix,
} from "@menugo/dto";
import { ALL_TRIGGER_EVENTS, TRIGGER_EVENT_LABELS } from "@menugo/dto";

class NotificationService {
    async registerToken(
        userId: string,
        token: string,
        deviceType: string,
        deviceName?: string
    ) {
        return deviceTokenRepository.upsert(userId, token, deviceType, deviceName);
    }

    async unregisterToken(token: string) {
        return deviceTokenRepository.deactivate(token);
    }

    async getSettingsMatrix(
        restaurantId: number
    ): Promise<NotificationSettingsMatrix[]> {
        // Get all roles for this restaurant
        const restaurantRoles = await db
            .select({ id: roles.id, name: roles.name })
            .from(roles)
            .where(eq(roles.restaurantId, restaurantId));

        // Get all existing settings
        const settings =
            await notificationSettingsRepository.findByRestaurant(restaurantId);

        // Build matrix
        return ALL_TRIGGER_EVENTS.map((event) => ({
            triggerEvent: event,
            label: TRIGGER_EVENT_LABELS[event],
            roles: restaurantRoles.map((role) => {
                const setting = settings.find(
                    (s) =>
                        s.triggerEvent === event && s.roleId === role.id
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
        settings: Array<{
            triggerEvent: string;
            roleId: number;
            enabled: boolean;
        }>
    ) {
        return notificationSettingsRepository.bulkUpsert(
            restaurantId,
            settings
        );
    }

    async seedDefaults(restaurantId: number) {
        return notificationSettingsRepository.seedDefaults(restaurantId);
    }

    async sendOrderNotification(
        restaurantId: number,
        triggerEvent: NotificationTriggerEvent,
        payload: OrderNotificationPayload
    ) {
        try {
            // Demo mode guard — suppress all push notifications
            const [restaurant] = await db
                .select({ isDemoMode: restaurants.isDemoMode })
                .from(restaurants)
                .where(eq(restaurants.id, restaurantId));

            if (restaurant?.isDemoMode) {
                logger.debug(
                    `Skipping notification for restaurant ${restaurantId} (demo mode)`
                );
                return;
            }

            // 1. Get enabled roles for this event
            const enabledRoles =
                await notificationSettingsRepository.findEnabledByEvent(
                    restaurantId,
                    triggerEvent
                );

            if (enabledRoles.length === 0) {
                logger.debug(
                    `No notification settings for event ${triggerEvent} in restaurant ${restaurantId}`
                );
                return;
            }

            const roleIds = enabledRoles.map((r) => r.roleId);

            // 2. Find all users with those roles in this restaurant
            const usersWithRoles = await db
                .select({ userId: userRoles.userId })
                .from(userRoles)
                .where(
                    and(
                        eq(userRoles.restaurantId, restaurantId),
                        inArray(userRoles.roleId, roleIds)
                    )
                );

            // Also include restaurant owners (they may not have explicit roles)
            const owners = await db
                .select({ userId: restaurantMembers.userId })
                .from(restaurantMembers)
                .where(
                    and(
                        eq(restaurantMembers.restaurantId, restaurantId),
                        eq(restaurantMembers.isOwner, true)
                    )
                );

            // Check if any owner role is in the enabled roles
            const ownerRole = enabledRoles.find(
                (r) => r.roleName.toLowerCase() === "owner"
            );

            const userIds = [
                ...new Set([
                    ...usersWithRoles.map((u) => u.userId),
                    ...(ownerRole ? owners.map((o) => o.userId) : []),
                ]),
            ];

            if (userIds.length === 0) {
                logger.debug(
                    `No users to notify for event ${triggerEvent} in restaurant ${restaurantId}`
                );
                return;
            }

            // 3. Get FCM tokens for those users
            const tokens = await deviceTokenRepository.findByUsers(userIds);

            if (tokens.length === 0) {
                logger.debug(
                    `No device tokens found for ${userIds.length} users`
                );
                return;
            }

            // 4. Build and send notification
            const { title, body } = this.buildNotificationContent(
                triggerEvent,
                payload
            );
            const fcmTokens = tokens.map((t) => t.token);

            await this.sendMulticast(fcmTokens, title, body, {
                type: payload.type,
                orderId: String(payload.orderId),
                orderNumber: payload.orderNumber,
                restaurantId: String(payload.restaurantId),
                tableNumber: payload.tableNumber
                    ? String(payload.tableNumber)
                    : "",
            });

            // Log notification dispatch for history / audit
            notificationLogRepository
                .create({
                    restaurantId,
                    orderId: payload.orderId,
                    eventType: triggerEvent,
                    recipientRoleIds: roleIds,
                    recipientUserIds: userIds,
                    fcmSuccessCount: fcmTokens.length,
                    fcmFailureCount: 0,
                    payload: payload as unknown as Record<string, unknown>,
                })
                .catch(() => {});

            logger.info(
                `Sent ${triggerEvent} notification to ${fcmTokens.length} devices for order #${payload.orderNumber}`
            );
        } catch (error) {
            logger.error("Failed to send order notification", error);
        }
    }

    private async sendMulticast(
        tokens: string[],
        title: string,
        body: string,
        data: Record<string, string>
    ) {
        if (tokens.length === 0) return;

        const messaging = getMessaging();
        if (!messaging) return;

        const message = {
            tokens,
            notification: { title, body },
            data,
            android: {
                priority: "high" as const,
                notification: {
                    channelId: "orders",
                    sound: "default",
                },
            },
            apns: {
                headers: { "apns-priority": "10" },
                payload: {
                    aps: {
                        sound: "default",
                        badge: 1,
                    },
                },
            },
        };

        const response = await messaging.sendEachForMulticast(message);

        // Handle stale tokens
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
                        logger.warn(
                            `FCM send failed for token: ${code}`,
                            resp.error.message
                        );
                    }
                }
            });

            if (staleTokens.length > 0) {
                logger.info(
                    `Removing ${staleTokens.length} stale FCM tokens`
                );
                await deviceTokenRepository.deactivateTokens(staleTokens);
            }
        }

        return response;
    }

    private buildNotificationContent(
        triggerEvent: NotificationTriggerEvent,
        payload: OrderNotificationPayload
    ): { title: string; body: string } {
        const orderRef = `#${payload.orderNumber}`;
        const tableRef = payload.tableNumber
            ? `Table ${payload.tableNumber}`
            : "";

        switch (triggerEvent) {
            case "order_placed":
                return {
                    title: `New Order ${orderRef}`,
                    body: tableRef
                        ? `${tableRef} - New order received`
                        : "New order received",
                };
            case "status_received_to_preparing":
                return {
                    title: `Order ${orderRef} Being Prepared`,
                    body: tableRef
                        ? `${tableRef} - Kitchen started preparing`
                        : "Kitchen started preparing",
                };
            case "status_preparing_to_ready":
                return {
                    title: `Order ${orderRef} Ready`,
                    body: tableRef
                        ? `${tableRef} - Ready for pickup`
                        : "Ready for pickup",
                };
            case "status_ready_to_served":
                return {
                    title: `Order ${orderRef} Served`,
                    body: tableRef
                        ? `${tableRef} - Order has been served`
                        : "Order has been served",
                };
            case "status_served_to_paid":
                return {
                    title: `Order ${orderRef} Paid`,
                    body: tableRef
                        ? `${tableRef} - Payment received`
                        : "Payment received",
                };
            case "order_cancelled":
                return {
                    title: `Order ${orderRef} Cancelled`,
                    body: tableRef
                        ? `${tableRef} - Order was cancelled`
                        : "Order was cancelled",
                };
            default:
                return {
                    title: `Order ${orderRef} Updated`,
                    body: "Order status has changed",
                };
        }
    }
}

export const notificationService = new NotificationService();
