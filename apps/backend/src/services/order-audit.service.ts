import { auditService } from "./audit.service";
import type { AuditContext } from "../types";

/**
 * Typed fire-and-forget audit wrappers for every order lifecycle event.
 *
 * Each method calls `auditService.log(…).catch(() => {})` so it never
 * propagates a failure to the caller.  The `AuditContext` is optional —
 * when absent (e.g. system-triggered events) the log is silently skipped.
 *
 * Design rationale: centralising these calls means:
 * 1. `OrderService` methods contain no raw `auditService.log` calls.
 * 2. Field names / action strings are typed and consistent.
 * 3. Adding a new audit field (e.g. `metadata`) requires a single change here.
 */
class OrderAuditService {
  /** Record a status transition (e.g. received → preparing). */
  logStatusChange(
    params: {
      orderId: number;
      restaurantId: number;
      fromStatus: string;
      toStatus: string;
    },
    ctx?: AuditContext,
  ): void {
    if (!ctx) return;
    auditService
      .log({
        restaurantId: params.restaurantId,
        actorUserId: ctx.actorUserId,
        action: "order_status_changed",
        entityType: "order",
        entityId: params.orderId,
        oldValue: { status: params.fromStatus },
        newValue: { status: params.toStatus },
        ipAddress: ctx.ipAddress,
      })
      .catch(() => {});
  }

  /** Record an order void with the mandatory reason string. */
  logVoid(
    params: {
      orderId: number;
      restaurantId: number;
      fromStatus: string;
      reason: string;
    },
    ctx?: AuditContext,
  ): void {
    if (!ctx) return;
    auditService
      .log({
        restaurantId: params.restaurantId,
        actorUserId: ctx.actorUserId,
        action: "order_voided",
        entityType: "order",
        entityId: params.orderId,
        oldValue: { status: params.fromStatus },
        newValue: { status: "cancelled" },
        reason: params.reason,
        ipAddress: ctx.ipAddress,
      })
      .catch(() => {});
  }

  /** Record a waiter claiming an order for delivery. */
  logClaim(
    params: {
      orderId: number;
      restaurantId: number;
      claimedByUserId: string;
    },
    ctx?: AuditContext,
  ): void {
    if (!ctx) return;
    auditService
      .log({
        restaurantId: params.restaurantId,
        actorUserId: ctx.actorUserId,
        action: "order_claimed",
        entityType: "order",
        entityId: params.orderId,
        newValue: { claimedBy: params.claimedByUserId },
        ipAddress: ctx.ipAddress,
      })
      .catch(() => {});
  }

  /** Record an item quantity change or removal on an active order. */
  logItemEdit(
    params: {
      orderId: number;
      restaurantId: number;
      orderItemId: number;
      oldQuantity: number;
      newQuantity: number | null; // null = removed
    },
    ctx?: AuditContext,
  ): void {
    if (!ctx) return;
    const newValue =
      params.newQuantity === null
        ? { itemId: params.orderItemId, removed: true }
        : { itemId: params.orderItemId, quantity: params.newQuantity };

    auditService
      .log({
        restaurantId: params.restaurantId,
        actorUserId: ctx.actorUserId,
        action: "override",
        entityType: "order",
        entityId: params.orderId,
        oldValue: { itemId: params.orderItemId, quantity: params.oldQuantity },
        newValue,
        ipAddress: ctx.ipAddress,
      })
      .catch(() => {});
  }

  /** Record a manual notification resend. */
  logResend(
    params: {
      orderId: number;
      restaurantId: number;
      triggerEvent: string;
      status: string;
    },
    ctx?: AuditContext,
  ): void {
    if (!ctx) return;
    auditService
      .log({
        restaurantId: params.restaurantId,
        actorUserId: ctx.actorUserId,
        action: "notification_resent",
        entityType: "order",
        entityId: params.orderId,
        newValue: { triggerEvent: params.triggerEvent, status: params.status },
        ipAddress: ctx.ipAddress,
      })
      .catch(() => {});
  }
}

export const orderAuditService = new OrderAuditService();
