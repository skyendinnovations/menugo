import { getMessaging } from "../config/firebase";
import { restaurantRepository } from "../repositories/restaurant.repository";
import { availabilityRepository } from "../repositories/availability.repository";
import { customerDeviceTokenRepository } from "../repositories/customer-device-token.repository";
import { deviceTokenRepository } from "../repositories/device-token.repository";
import { orderRepository } from "../repositories/order.repository";
import { notificationLogRepository } from "../repositories/notification-log.repository";
import { notificationSettingsRepository } from "../repositories/notification-settings.repository";
import { workflowRepository } from "../repositories/workflow.repository";
import { eventBus } from "./event-bus.service";
import { logger } from "../utils/logger";
import { sendExpoPush } from "../utils/expo-push";
import type { OrderNotificationPayload, WorkflowMode } from "@menugo/dto";

/** Extra fields needed to build SSE payloads that are not in OrderNotificationPayload. */
export interface NotificationSseContext {
  sessionId?: number;
  itemCount?: number;
  tableNumber?: number;
  acceptedBy?: string;
  claimedBy?: string;
}

/**
 * Central notification orchestrator.
 *
 * Single public entry point: `dispatch()`.  It:
 *   1. Emits the SSE event for real-time clients.
 *   2. Routes push notifications using a first-match strategy:
 *      - Demo mode → push suppressed.
 *      - self_service + customer-notify step → sendToCustomerDevice.
 *      - full_service + customer-notify step → sendToAvailableWaiters
 *                                              (fallback: sendToAllClockedIn).
 *      - fast_service + order_placed → sendToAllClockedIn.
 *      - default → sendByRoleSettings.
 *
 * Each strategy records a `routingStrategy` label inside the notification_log
 * payload column so queries can filter on it.
 */
class NotificationOrchestrator {
  /**
   * Dispatch a notification for an order event.
   *
   * @param restaurantId  The restaurant that owns the order.
   * @param triggerEvent  Machine-readable event name, e.g. `"order_placed"` or
   *                      `"status_preparing_to_ready"`.
   * @param payload       Push notification data (see OrderNotificationPayload).
   * @param sseContext    Optional extra fields needed only for the SSE event
   *                      (e.g. `sessionId`, `itemCount`, `acceptedBy`).
   */
  async dispatch(
    restaurantId: number,
    triggerEvent: string,
    payload: OrderNotificationPayload,
    sseContext: NotificationSseContext = {},
  ): Promise<void> {
    try {
      // ── 1. Emit SSE immediately (synchronous, never throws) ─────────────
      this.emitSse(restaurantId, triggerEvent, payload, sseContext);

      // ── 2. Resolve restaurant metadata ──────────────────────────────────
      const restaurant = await restaurantRepository.findById(restaurantId);

      // Demo mode: suppress all push notifications
      if (restaurant?.isDemoMode) {
        logger.debug(
          `Orchestrator: push suppressed — restaurant ${restaurantId} is in demo mode`,
        );
        return;
      }

      const workflowMode: WorkflowMode =
        (restaurant?.workflowMode as WorkflowMode) ?? "full_service";

      // ── 3. Determine whether this is a customer-notify transition ────────
      const customerNotifyStates =
        await workflowRepository.findCustomerNotifyToStates(restaurantId);
      const toState = extractToState(triggerEvent);
      const isCustomerStep =
        toState !== null && customerNotifyStates.includes(toState);

      // ── 4. Route push (first match wins) ────────────────────────────────

      // self_service + customer-notify transition → notify the customer
      if (workflowMode === "self_service" && isCustomerStep) {
        await this.sendToCustomerDevice(
          restaurantId,
          payload,
          "self_service_customer",
        );
        return;
      }

      // full_service + customer-notify transition → available waiters first
      if (workflowMode === "full_service" && isCustomerStep) {
        await this.sendToAvailableWaiters(
          restaurantId,
          payload,
          "full_service_available_waiters",
        );
        return;
      }

      // fast_service new order → broadcast to everyone on shift
      if (workflowMode === "fast_service" && triggerEvent === "order_placed") {
        await this.sendToAllClockedIn(
          restaurantId,
          payload,
          "fast_service_broadcast",
        );
        return;
      }

      // Default: role-based notification settings
      await this.sendByRoleSettings(
        restaurantId,
        triggerEvent,
        payload,
        "role_settings",
      );
    } catch (error) {
      logger.error(
        `Orchestrator: failed to dispatch ${triggerEvent} for restaurant ${restaurantId}`,
        error,
      );
    }
  }

  // ── Private strategies ──────────────────────────────────────────────────

  /**
   * self_service path: notify the customer who placed the order via their
   * registered device token.
   */
  private async sendToCustomerDevice(
    restaurantId: number,
    payload: OrderNotificationPayload,
    routingStrategy: string,
  ): Promise<void> {
    const order = await orderRepository.findById(payload.orderId);
    if (!order?.createdByDeviceId) {
      logger.debug(
        `Orchestrator [${routingStrategy}]: no device ID on order ${payload.orderId}`,
      );
      return;
    }

    const tokens = await customerDeviceTokenRepository.findByDeviceId(
      order.createdByDeviceId,
    );

    if (tokens.length === 0) {
      logger.debug(
        `Orchestrator [${routingStrategy}]: no customer tokens for device ${order.createdByDeviceId}`,
      );
      return;
    }

    const result = await this.sendPush(
      tokens,
      `Order #${payload.orderNumber} Ready!`,
      payload,
      "Your order is ready for pickup at the counter.",
    );

    notificationLogRepository
      .create({
        restaurantId,
        orderId: payload.orderId,
        eventType: payload.type,
        recipientRoleIds: [],
        recipientUserIds: [],
        fcmSuccessCount: result.successCount,
        fcmFailureCount: result.failureCount,
        payload: { ...payload, routingStrategy } as Record<string, unknown>,
      })
      .catch(() => {});

    logger.info(
      `Orchestrator [${routingStrategy}]: sent customer notification for order #${payload.orderNumber}`,
    );
  }

  /**
   * full_service path: send to available waiters (clocked_in, no active orders).
   * Falls back to all clocked-in staff when nobody is free.
   */
  private async sendToAvailableWaiters(
    restaurantId: number,
    payload: OrderNotificationPayload,
    routingStrategy: string,
  ): Promise<void> {
    const available =
      await availabilityRepository.findAvailableStaff(restaurantId);

    if (available.length === 0) {
      logger.debug(
        `Orchestrator [${routingStrategy}]: no available waiters for restaurant ${restaurantId} — falling back to all clocked-in`,
      );
      await this.sendToAllClockedIn(
        restaurantId,
        payload,
        `${routingStrategy}_fallback`,
      );
      return;
    }

    const userIds = available.map((s) => s.userId);
    const tokens = await deviceTokenRepository.findByUsers(userIds);

    if (tokens.length === 0) {
      logger.debug(
        `Orchestrator [${routingStrategy}]: no device tokens for available waiters`,
      );
      return;
    }

    const result = await this.sendPush(
      tokens,
      "Order Ready for Pickup",
      payload,
    );

    notificationLogRepository
      .create({
        restaurantId,
        orderId: payload.orderId,
        eventType: payload.type,
        recipientRoleIds: [],
        recipientUserIds: userIds,
        fcmSuccessCount: result.successCount,
        fcmFailureCount: result.failureCount,
        payload: { ...payload, routingStrategy } as Record<string, unknown>,
      })
      .catch(() => {});

    logger.info(
      `Orchestrator [${routingStrategy}]: sent to ${tokens.length} available waiters for order #${payload.orderNumber}`,
    );
  }

  /**
   * Broadcast push to every clocked-in staff member at the restaurant.
   */
  private async sendToAllClockedIn(
    restaurantId: number,
    payload: OrderNotificationPayload,
    routingStrategy: string,
  ): Promise<void> {
    const clockedIn =
      await availabilityRepository.findClockedIn(restaurantId);

    if (clockedIn.length === 0) {
      logger.debug(
        `Orchestrator [${routingStrategy}]: no clocked-in staff for restaurant ${restaurantId}`,
      );
      return;
    }

    const userIds = clockedIn.map((s) => s.userId);
    const tokens = await deviceTokenRepository.findByUsers(userIds);

    if (tokens.length === 0) {
      logger.debug(
        `Orchestrator [${routingStrategy}]: no device tokens for clocked-in staff`,
      );
      return;
    }

    const title =
      payload.type === "order_placed"
        ? `New Order #${payload.orderNumber}`
        : `Order #${payload.orderNumber} Ready`;

    const result = await this.sendPush(tokens, title, payload);

    notificationLogRepository
      .create({
        restaurantId,
        orderId: payload.orderId,
        eventType: payload.type,
        recipientRoleIds: [],
        recipientUserIds: userIds,
        fcmSuccessCount: result.successCount,
        fcmFailureCount: result.failureCount,
        payload: { ...payload, routingStrategy } as Record<string, unknown>,
      })
      .catch(() => {});

    logger.info(
      `Orchestrator [${routingStrategy}]: broadcast to ${tokens.length} clocked-in staff for order #${payload.orderNumber}`,
    );
  }

  /**
   * Default path: look up which roles have push enabled for this trigger event
   * and send to all clocked-in members of those roles in a single DB query.
   */
  private async sendByRoleSettings(
    restaurantId: number,
    triggerEvent: string,
    payload: OrderNotificationPayload,
    routingStrategy: string,
  ): Promise<void> {
    const userIds =
      await notificationSettingsRepository.findRecipientsForEvent(
        restaurantId,
        triggerEvent,
      );

    if (userIds.length === 0) {
      logger.debug(
        `Orchestrator [${routingStrategy}]: no recipients for event "${triggerEvent}" in restaurant ${restaurantId}`,
      );
      return;
    }

    const tokens = await deviceTokenRepository.findByUsers(userIds);

    if (tokens.length === 0) {
      logger.debug(
        `Orchestrator [${routingStrategy}]: no device tokens for ${userIds.length} recipients`,
      );
      return;
    }

    const title =
      payload.type === "order_placed"
        ? `New Order #${payload.orderNumber}`
        : payload.tableNumber
          ? `Order #${payload.orderNumber} — Table ${payload.tableNumber}`
          : `Order #${payload.orderNumber} updated`;

    const result = await this.sendPush(tokens, title, payload);

    notificationLogRepository
      .create({
        restaurantId,
        orderId: payload.orderId,
        eventType: triggerEvent,
        recipientRoleIds: [],
        recipientUserIds: userIds,
        fcmSuccessCount: result.successCount,
        fcmFailureCount: result.failureCount,
        payload: { ...payload, routingStrategy } as Record<string, unknown>,
      })
      .catch(() => {});

    logger.info(
      `Orchestrator [${routingStrategy}]: sent to ${tokens.length} tokens (${userIds.length} users) for event "${triggerEvent}"`,
    );
  }

  // ── Shared push helpers ─────────────────────────────────────────────────

  /**
   * Route tokens to the appropriate push provider based on device type:
   * - `"web"` → Firebase Cloud Messaging (FCM)
   * - anything else (iOS/Android) → Expo Push API
   */
  private async sendPush(
    tokenRecords: Array<{ token: string; deviceType: string | null }>,
    title: string,
    payload: OrderNotificationPayload,
    body?: string,
  ): Promise<{ successCount: number; failureCount: number }> {
    if (tokenRecords.length === 0) return { successCount: 0, failureCount: 0 };

    const notifBody =
      body ??
      (payload.tableNumber
        ? `Table ${payload.tableNumber}`
        : "Tap to view details");

    const data: Record<string, string> = {
      type: payload.type,
      orderId: String(payload.orderId),
      orderNumber: payload.orderNumber,
      restaurantId: String(payload.restaurantId),
      tableNumber: payload.tableNumber ? String(payload.tableNumber) : "",
    };

    const webTokens = tokenRecords
      .filter((t) => t.deviceType === "web")
      .map((t) => t.token);
    const nativeTokens = tokenRecords
      .filter((t) => t.deviceType !== "web")
      .map((t) => t.token);

    let totalSuccess = 0;
    let totalFailure = 0;

    if (webTokens.length > 0) {
      const r = await this.sendFCM(webTokens, title, notifBody, data);
      totalSuccess += r?.successCount ?? 0;
      totalFailure += r?.failureCount ?? (r === null ? webTokens.length : 0);
    }

    if (nativeTokens.length > 0) {
      const r = await sendExpoPush(nativeTokens, title, notifBody, data);
      totalSuccess += r.successCount;
      totalFailure += r.failureCount;
    }

    return { successCount: totalSuccess, failureCount: totalFailure };
  }

  /** Low-level FCM multicast send for web tokens. */
  private async sendFCM(
    tokens: string[],
    title: string,
    body: string,
    data: Record<string, string>,
  ): Promise<{ successCount: number; failureCount: number } | null> {
    if (tokens.length === 0) return null;

    const messaging = getMessaging();
    if (!messaging) return null;

    const message = {
      tokens,
      notification: { title, body },
      data,
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

      // Clean up stale FCM registrations
      if (response.failureCount > 0) {
        const staleTokens: string[] = [];
        response.responses.forEach((resp: any, idx: number) => {
          if (resp.error) {
            const code: string = resp.error.code ?? "";
            if (
              code === "messaging/registration-token-not-registered" ||
              code === "messaging/invalid-registration-token"
            ) {
              const t = tokens[idx];
              if (t) staleTokens.push(t);
            }
          }
        });
        if (staleTokens.length > 0) {
          deviceTokenRepository.deactivateTokens(staleTokens).catch(() => {});
        }
      }

      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      logger.error("Orchestrator: FCM sendEachForMulticast failed", error);
      return null;
    }
  }

  // ── SSE emission ─────────────────────────────────────────────────────────

  /**
   * Emit the correct SSE event for real-time dashboard clients.
   * All order events that were previously scattered across OrderService are
   * now centralised here.
   */
  private emitSse(
    restaurantId: number,
    triggerEvent: string,
    payload: OrderNotificationPayload,
    ctx: NotificationSseContext,
  ): void {
    try {
      switch (triggerEvent) {
        case "order_placed":
          eventBus.emit(restaurantId, "order_placed", {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber,
            tableNumber: ctx.tableNumber ?? payload.tableNumber,
            sessionId: ctx.sessionId ?? 0,
            itemCount: ctx.itemCount ?? 0,
          });
          break;

        case "order_cancelled":
          eventBus.emit(restaurantId, "order_cancelled", {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber,
          });
          break;

        case "order_accepted":
          eventBus.emit(restaurantId, "order_accepted", {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber,
            acceptedBy: ctx.acceptedBy ?? "",
          });
          break;

        case "order_claimed":
          eventBus.emit(restaurantId, "order_claimed", {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber,
            claimedBy: ctx.claimedBy ?? "",
          });
          break;

        default:
          // Status transitions (status_X_to_Y) and anything else
          eventBus.emit(restaurantId, "order_status_changed", {
            orderId: payload.orderId,
            orderNumber: payload.orderNumber,
            fromStatus: payload.fromStatus ?? "",
            toStatus: payload.toStatus ?? "",
          });
          break;
      }
    } catch (error) {
      logger.error(
        `Orchestrator: SSE emit failed for ${triggerEvent}`,
        error,
      );
    }
  }
}

// ── Module-level helpers ────────────────────────────────────────────────────

/**
 * Extract the `toState` from a status-transition trigger event.
 *
 * `"status_preparing_to_ready"` → `"ready"`
 * `"order_placed"` → `null`
 */
function extractToState(triggerEvent: string): string | null {
  // Trigger events for status transitions follow the pattern status_<from>_to_<to>
  const match = triggerEvent.match(/^status_\w+_to_(\w+)$/);
  return match?.[1] ?? null;
}

export const notificationOrchestrator = new NotificationOrchestrator();
