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
  sessionParticipants,
  kitchenMenuItems,
  kitchenMembers,
  kitchens,
  orderItems,
} from "@menugo/data/schemas";
import type {
  NotificationTriggerEvent,
  OrderNotificationPayload,
  NotificationSettingsMatrix,
  CustomerNotificationPayload,
} from "@menugo/dto";
import { ALL_TRIGGER_EVENTS, TRIGGER_EVENT_LABELS } from "@menugo/dto";

class NotificationService {
  async registerToken(
    userId: string,
    token: string,
    deviceType: string,
    deviceName?: string,
  ) {
    return deviceTokenRepository.upsert(userId, token, deviceType, deviceName);
  }
  async unregisterToken(token: string) {
    return deviceTokenRepository.deactivate(token);
  }
  async registerCustomerToken(
    deviceId: string,
    token: string,
    deviceType: string,
  ) {
    return customerDeviceTokenRepository.upsert(deviceId, token, deviceType);
  }

  async getSettingsMatrix(
    restaurantId: number,
  ): Promise<NotificationSettingsMatrix[]> {
    const restaurantRoles = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.restaurantId, restaurantId));
    const settings =
      await notificationSettingsRepository.findByRestaurant(restaurantId);
    return ALL_TRIGGER_EVENTS.map((event) => ({
      triggerEvent: event,
      label: TRIGGER_EVENT_LABELS[event],
      roles: restaurantRoles.map((role) => {
        const setting = settings.find(
          (s) => s.triggerEvent === event && s.roleId === role.id,
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
    settings: Array<{ triggerEvent: string; roleId: number; enabled: boolean }>,
  ) {
    return notificationSettingsRepository.bulkUpsert(restaurantId, settings);
  }
  async seedDefaults(restaurantId: number) {
    return notificationSettingsRepository.seedDefaults(restaurantId);
  }

  async sendOrderNotification(
    restaurantId: number,
    triggerEvent: NotificationTriggerEvent,
    payload: OrderNotificationPayload,
  ) {
    try {
      const enabledRoles =
        await notificationSettingsRepository.findEnabledByEvent(
          restaurantId,
          triggerEvent,
        );
      if (enabledRoles.length === 0) return;
      const roleIds = enabledRoles.map((r) => r.roleId);
      const usersWithRoles = await db
        .select({ userId: userRoles.userId })
        .from(userRoles)
        .where(
          and(
            eq(userRoles.restaurantId, restaurantId),
            inArray(userRoles.roleId, roleIds),
          ),
        );
      const owners = await db
        .select({ userId: restaurantMembers.userId })
        .from(restaurantMembers)
        .where(
          and(
            eq(restaurantMembers.restaurantId, restaurantId),
            eq(restaurantMembers.isOwner, true),
          ),
        );
      const ownerRole = enabledRoles.find(
        (r) => r.roleName.toLowerCase() === "owner",
      );
      const userIds = [
        ...new Set([
          ...usersWithRoles.map((u) => u.userId),
          ...(ownerRole ? owners.map((o) => o.userId) : []),
        ]),
      ];
      if (userIds.length === 0) return;
      const tokens = await deviceTokenRepository.findByUsers(userIds);
      if (tokens.length === 0) return;
      const { title, body } = this.buildOrderNotificationContent(
        triggerEvent,
        payload,
      );
      await this.sendMulticast(
        tokens.map((t) => t.token),
        title,
        body,
        this.serializePayload(payload),
      );
    } catch (error) {
      logger.error("Failed to send order notification", error);
    }
  }

  async sendOrderNotificationToKitchensByItems(
    restaurantId: number,
    triggerEvent: NotificationTriggerEvent,
    payload: OrderNotificationPayload,
    orderId: number,
  ) {
    const items = await db
      .select({
        menuItemId: orderItems.menuItemId,
        itemName: orderItems.itemName,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
    if (items.length === 0)
      return this.sendOrderNotification(restaurantId, triggerEvent, payload);

    const menuItemIds = [...new Set(items.map((i) => i.menuItemId))];
    const mappings = await db
      .select({
        kitchenId: kitchenMenuItems.kitchenId,
        menuItemId: kitchenMenuItems.menuItemId,
      })
      .from(kitchenMenuItems)
      .innerJoin(kitchens, eq(kitchenMenuItems.kitchenId, kitchens.id))
      .where(
        and(
          eq(kitchens.restaurantId, restaurantId),
          eq(kitchens.isActive, true),
          inArray(kitchenMenuItems.menuItemId, menuItemIds),
        ),
      );

    // Identify unmapped items
    const unmapped = items.filter(
      (i) => !mappings.some((m) => m.menuItemId === i.menuItemId),
    );

    // If all items are unmapped, send general notification
    if (mappings.length === 0 || unmapped.length > 0) {
      await this.sendOrderNotification(restaurantId, triggerEvent, payload);
    }

    const kitchenToItems = new Map<number, number[]>();
    for (const m of mappings) {
      const arr = kitchenToItems.get(m.kitchenId) || [];
      arr.push(m.menuItemId);
      kitchenToItems.set(m.kitchenId, arr);
    }

    for (const [kitchenId, dishIds] of kitchenToItems.entries()) {
      const users = await db
        .select({ userId: kitchenMembers.userId })
        .from(kitchenMembers)
        .where(eq(kitchenMembers.kitchenId, kitchenId));
      const userIds = [...new Set(users.map((u) => u.userId))];
      if (userIds.length === 0) continue;
      const tokens = await deviceTokenRepository.findByUsers(userIds);
      if (tokens.length === 0) continue;
      const itemSummary = items
        .filter((i) => dishIds.includes(i.menuItemId))
        .map((i) => `${i.quantity}x ${i.itemName}`)
        .join(", ");
      const { title } = this.buildOrderNotificationContent(
        triggerEvent,
        payload,
      );
      await this.sendMulticast(
        tokens.map((t) => t.token),
        title,
        itemSummary || `Order #${payload.orderNumber}`,
        this.serializePayload(payload),
      );
    }
  }

  async sendItemNotification(
    restaurantId: number,
    triggerEvent: NotificationTriggerEvent,
    payload: OrderNotificationPayload,
    kitchenAcceptorId: string | null,
    waiterAcceptorId: string | null,
  ) {
    try {
      const assignedUserIds = [
        ...(kitchenAcceptorId ? [kitchenAcceptorId] : []),
        ...(waiterAcceptorId ? [waiterAcceptorId] : []),
      ];
      let targetUserIds: string[] = [];
      if (assignedUserIds.length > 0)
        targetUserIds = [...new Set(assignedUserIds)];
      else {
        const enabledRoles =
          await notificationSettingsRepository.findEnabledByEvent(
            restaurantId,
            triggerEvent,
          );
        if (enabledRoles.length === 0) return;
        const roleIds = enabledRoles.map((r) => r.roleId);
        const usersWithRoles = await db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(
            and(
              eq(userRoles.restaurantId, restaurantId),
              inArray(userRoles.roleId, roleIds),
            ),
          );
        targetUserIds = [...new Set(usersWithRoles.map((u) => u.userId))];
      }
      if (targetUserIds.length === 0) return;
      const tokens = await deviceTokenRepository.findByUsers(targetUserIds);
      if (tokens.length === 0) return;
      const { title, body } = this.buildOrderNotificationContent(
        triggerEvent,
        payload,
      );
      await this.sendMulticast(
        tokens.map((t) => t.token),
        title,
        body,
        this.serializePayload(payload),
      );
    } catch (error) {
      logger.error("Failed to send item notification", error);
    }
  }

  async sendCustomerNotification(
    sessionId: number,
    payload: CustomerNotificationPayload,
  ) {
    try {
      const participants = await db
        .select({ deviceId: sessionParticipants.deviceId })
        .from(sessionParticipants)
        .where(
          and(
            eq(sessionParticipants.sessionId, sessionId),
            eq(sessionParticipants.status, "active"),
          ),
        );
      if (participants.length === 0) return;
      const deviceIds = [...new Set(participants.map((p) => p.deviceId))];
      const tokens =
        await customerDeviceTokenRepository.findByDeviceIds(deviceIds);
      if (tokens.length === 0) return;
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
        true,
      );
    } catch (error) {
      logger.error("Failed to send customer notification", error);
    }
  }

  private async sendMulticast(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string>,
    isCustomer = false,
  ) {
    if (tokens.length === 0) return;

    try {
      const response = await getMessaging().sendEachForMulticast({
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
      });

      // Handle stale/invalid FCM tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, index) => {
        if (
          resp.error?.code === "messaging/registration-token-not-registered" ||
          resp.error?.code === "messaging/invalid-registration-token"
        ) {
          invalidTokens.push(tokens[index]);
        }
      });

      if (invalidTokens.length > 0) {
        try {
          if (isCustomer) {
            await customerDeviceTokenRepository.deactivateTokens(invalidTokens);
          } else {
            await deviceTokenRepository.deactivateTokens(invalidTokens);
          }
        } catch (err) {
          logger.error("Failed to deactivate invalid tokens", {
            invalidTokens,
            error: err,
          });
        }
      }

      return response;
    } catch (error) {
      logger.error("Failed to send multicast notification", {
        error,
        tokenCount: tokens.length,
      });
      throw error;
    }
  }

  private buildOrderNotificationContent(
    triggerEvent: NotificationTriggerEvent,
    payload: OrderNotificationPayload,
  ): { title: string; body: string } {
    const orderRef = `#${payload.orderNumber}`;
    switch (triggerEvent) {
      case "order_placed":
        return { title: `New Order ${orderRef}`, body: "New order received" };
      default:
        return {
          title: `Order ${orderRef} Updated`,
          body: "Order status has changed",
        };
    }
  }
  private buildCustomerNotificationContent(
    payload: CustomerNotificationPayload,
  ): { title: string; body: string } {
    return {
      title: `Order #${payload.orderNumber} Updated`,
      body: payload.message || "Your order status has changed",
    };
  }
  private serializePayload(
    payload: OrderNotificationPayload,
  ): Record<string, string> {
    return {
      type: payload.type,
      orderId: String(payload.orderId),
      orderNumber: payload.orderNumber,
      restaurantId: String(payload.restaurantId),
    };
  }
}

export const notificationService = new NotificationService();
