import { getMessaging } from "../config/firebase";
import { restaurantRepository } from "../repositories/restaurant.repository";
import { availabilityRepository } from "../repositories/availability.repository";
import { customerDeviceTokenRepository } from "../repositories/customer-device-token.repository";
import { deviceTokenRepository } from "../repositories/device-token.repository";
import { orderRepository } from "../repositories/order.repository";
import { notificationLogRepository } from "../repositories/notification-log.repository";
import { notificationService } from "./notification.service";
import { logger } from "../utils/logger";
import type {
  OrderNotificationPayload,
  WorkflowMode,
  NotificationTriggerEvent,
} from "@menugo/dto";

/**
 * Workflow-aware notification routing.
 *
 * Sits on top of the base notification service and routes notifications
 * differently depending on the restaurant's workflow mode:
 *
 * - **full_service**: order_ready → available waiters only (clocked_in, no active orders)
 * - **fast_service**: order_placed → ALL clocked-in staff
 * - **self_service**: order_ready → customer device via deviceId
 */
class WorkflowNotificationService {
  /**
   * Send a workflow-aware notification for an order event.
   * For events that have workflow-specific routing, the custom path is used.
   * For all other events, falls back to standard role-based routing.
   */
  async dispatch(
    restaurantId: number,
    triggerEvent: NotificationTriggerEvent,
    payload: OrderNotificationPayload,
  ): Promise<void> {
    try {
      const restaurant = await restaurantRepository.findById(restaurantId);
      const workflowMode: WorkflowMode =
        (restaurant?.workflowMode as WorkflowMode) || "full_service";

      // ── Full-service: order ready → available waiters only ──────
      if (
        workflowMode === "full_service" &&
        triggerEvent === "status_preparing_to_ready"
      ) {
        await this.sendToAvailableWaiters(restaurantId, payload);
        return;
      }

      // ── Fast-service: order placed → broadcast to all clocked-in ──
      if (
        workflowMode === "fast_service" &&
        triggerEvent === "order_placed"
      ) {
        await this.sendToAllClockedIn(restaurantId, payload);
        return;
      }

      // ── Self-service: order ready → customer device ────────────
      if (
        workflowMode === "self_service" &&
        triggerEvent === "status_preparing_to_ready"
      ) {
        await this.sendToCustomerDevice(restaurantId, payload);
        return;
      }

      // ── Default: no workflow-specific routing for this event ────
      // Fall back to standard role-based notification settings.
      await notificationService.sendOrderNotification(
        restaurantId,
        triggerEvent,
        payload,
      );
    } catch (error) {
      logger.error(
        `WorkflowNotification: failed to dispatch ${triggerEvent}`,
        error,
      );
    }
  }

  /**
   * Full-service: send notification to waiters who are clocked in
   * AND have zero active orders.
   */
  private async sendToAvailableWaiters(
    restaurantId: number,
    payload: OrderNotificationPayload,
  ): Promise<void> {
    const available =
      await availabilityRepository.findAvailableStaff(restaurantId);

    if (available.length === 0) {
      logger.debug(
        `WorkflowNotification: no available waiters for restaurant ${restaurantId}, falling back to all clocked-in`,
      );
      // Fallback: send to all clocked-in staff if none are free
      await this.sendToAllClockedIn(restaurantId, payload);
      return;
    }

    const userIds = available.map((s) => s.userId);
    const tokens = await deviceTokenRepository.findByUsers(userIds);

    if (tokens.length === 0) {
      logger.debug(
        `WorkflowNotification: no device tokens for available waiters`,
      );
      return;
    }

    const fcmTokens = tokens.map((t) => t.token);
    const response = await this.sendFCM(fcmTokens, "Order Ready for Pickup", payload);

    notificationLogRepository
      .create({
        restaurantId,
        orderId: payload.orderId,
        eventType: "status_preparing_to_ready",
        recipientRoleIds: [],
        recipientUserIds: userIds,
        fcmSuccessCount: response?.successCount ?? 0,
        fcmFailureCount: response?.failureCount ?? 0,
        payload: payload as unknown as Record<string, unknown>,
      })
      .catch(() => {});

    logger.info(
      `WorkflowNotification: sent to ${fcmTokens.length} available waiters for order #${payload.orderNumber}`,
    );
  }

  /**
   * Fast-service: broadcast to ALL clocked-in staff.
   */
  private async sendToAllClockedIn(
    restaurantId: number,
    payload: OrderNotificationPayload,
  ): Promise<void> {
    const clockedIn =
      await availabilityRepository.findClockedIn(restaurantId);

    if (clockedIn.length === 0) {
      logger.debug(
        `WorkflowNotification: no clocked-in staff for restaurant ${restaurantId}`,
      );
      return;
    }

    const userIds = clockedIn.map((s) => s.userId);
    const tokens = await deviceTokenRepository.findByUsers(userIds);

    if (tokens.length === 0) {
      logger.debug(
        `WorkflowNotification: no device tokens for clocked-in staff`,
      );
      return;
    }

    const fcmTokens = tokens.map((t) => t.token);
    const title =
      payload.type === "order_placed"
        ? `New Order #${payload.orderNumber}`
        : `Order #${payload.orderNumber} Ready`;
    const response = await this.sendFCM(fcmTokens, title, payload);

    notificationLogRepository
      .create({
        restaurantId,
        orderId: payload.orderId,
        eventType: payload.type === "order_placed" ? "order_placed" : "status_preparing_to_ready",
        recipientRoleIds: [],
        recipientUserIds: userIds,
        fcmSuccessCount: response?.successCount ?? 0,
        fcmFailureCount: response?.failureCount ?? 0,
        payload: payload as unknown as Record<string, unknown>,
      })
      .catch(() => {});

    logger.info(
      `WorkflowNotification: broadcast to ${fcmTokens.length} clocked-in staff for order #${payload.orderNumber}`,
    );
  }

  /**
   * Self-service: send notification to the customer's device.
   * Uses the order's createdByDeviceId to find the customer FCM token.
   */
  private async sendToCustomerDevice(
    restaurantId: number,
    payload: OrderNotificationPayload,
  ): Promise<void> {
    const order = await orderRepository.findById(payload.orderId);
    if (!order?.createdByDeviceId) {
      logger.debug(
        `WorkflowNotification: no device ID on order ${payload.orderId}`,
      );
      return;
    }

    const customerTokens = await customerDeviceTokenRepository.findByDeviceId(
      order.createdByDeviceId,
    );

    if (customerTokens.length === 0) {
      logger.debug(
        `WorkflowNotification: no customer device tokens for device ${order.createdByDeviceId}`,
      );
      return;
    }

    const fcmTokens = customerTokens.map((t) => t.token);
    const response = await this.sendFCM(
      fcmTokens,
      `Order #${payload.orderNumber} Ready!`,
      payload,
      "Your order is ready for pickup at the counter.",
    );

    notificationLogRepository
      .create({
        restaurantId,
        orderId: payload.orderId,
        eventType: "status_preparing_to_ready",
        recipientRoleIds: [],
        recipientUserIds: [],
        fcmSuccessCount: response?.successCount ?? 0,
        fcmFailureCount: response?.failureCount ?? 0,
        payload: payload as unknown as Record<string, unknown>,
      })
      .catch(() => {});

    logger.info(
      `WorkflowNotification: sent customer notification for order #${payload.orderNumber}`,
    );
  }

  /**
   * Low-level FCM send helper.
   */
  private async sendFCM(
    tokens: string[],
    title: string,
    payload: OrderNotificationPayload,
    body?: string,
  ): Promise<{ successCount: number; failureCount: number } | null> {
    if (tokens.length === 0) return null;

    const messaging = getMessaging();
    const message = {
      tokens,
      notification: {
        title,
        body:
          body ||
          (payload.tableNumber
            ? `Table ${payload.tableNumber}`
            : "Tap to view"),
      },
      data: {
        type: payload.type,
        orderId: String(payload.orderId),
        orderNumber: payload.orderNumber,
        restaurantId: String(payload.restaurantId),
        tableNumber: payload.tableNumber
          ? String(payload.tableNumber)
          : "",
      },
      android: {
        priority: "high" as const,
        notification: { channelId: "orders", sound: "default" },
      },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { sound: "default", badge: 1 } },
      },
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      if (response.failureCount > 0) {
        const staleTokens: string[] = [];
        response.responses.forEach((resp: any, idx: number) => {
          if (resp.error) {
            const code = resp.error.code;
            if (
              code === "messaging/registration-token-not-registered" ||
              code === "messaging/invalid-registration-token"
            ) {
              const token = tokens[idx];
              if (token) staleTokens.push(token);
            }
          }
        });
        if (staleTokens.length > 0) {
          await deviceTokenRepository.deactivateTokens(staleTokens);
        }
      }
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      logger.error("WorkflowNotification: FCM send failed", error);
      return null;
    }
  }
}

export const workflowNotificationService = new WorkflowNotificationService();
