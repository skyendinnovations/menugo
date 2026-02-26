import { tableRepository } from "../repositories/table.repository";
import { sessionRepository } from "../repositories/session.repository";
import { orderRepository } from "../repositories/order.repository";
import { restaurantRepository } from "../repositories/restaurant.repository";
import { auditService } from "./audit.service";
import { eventBus } from "./event-bus.service";
import { AppError } from "../types";
import type {
  CreateTableDTO,
  BulkCreateTablesDTO,
  UpdateTableDTO,
} from "@menugo/dto";
import { buildTableQRUrl, generateQRCodeDataURL } from "../utils/qr";
import { logger } from "../utils/logger";

/** Contextual info passed from the controller for audit logging. */
interface AuditContext {
  actorUserId: string;
  ipAddress?: string;
}

class TableService {
  /**
   * Get all tables for a restaurant, including helper block info.
   */
  async getTables(restaurantId: number) {
    return tableRepository.findByRestaurantWithBlockInfo(restaurantId);
  }

  async getTableById(id: number) {
    const table = await tableRepository.findById(id);
    if (!table) throw new AppError(404, "Table not found");
    return table;
  }

  async createTable(restaurantId: number, dto: CreateTableDTO) {
    const existing = await tableRepository.findByNumber(
      restaurantId,
      dto.tableNumber,
    );
    if (existing) {
      throw new AppError(409, `Table ${dto.tableNumber} already exists`);
    }
    return tableRepository.create(
      restaurantId,
      dto.tableNumber,
      dto.capacity ?? 4,
    );
  }

  async bulkCreateTables(restaurantId: number, dto: BulkCreateTablesDTO) {
    if (dto.from > dto.to) {
      throw new AppError(400, "'from' must be less than or equal to 'to'");
    }
    return tableRepository.bulkCreate(
      restaurantId,
      dto.from,
      dto.to,
      dto.capacity ?? 4,
    );
  }

  async updateTable(id: number, dto: UpdateTableDTO) {
    const table = await tableRepository.findById(id);
    if (!table) throw new AppError(404, "Table not found");
    return tableRepository.update(id, dto);
  }

  async deleteTable(id: number) {
    const table = await tableRepository.findById(id);
    if (!table) throw new AppError(404, "Table not found");
    return tableRepository.delete(id);
  }

  async getTableQR(id: number) {
    const table = await tableRepository.findById(id);
    if (!table) throw new AppError(404, "Table not found");

    const restaurant = await restaurantRepository.findById(table.restaurantId);
    if (!restaurant) throw new AppError(404, "Restaurant not found");

    const url = buildTableQRUrl(restaurant.slug, table.tableNumber);
    const qrDataUrl = await generateQRCodeDataURL(url);

    // Store the QR URL if not already stored
    if (!table.qrCode) {
      await tableRepository.update(id, { qrCode: url });
    }

    return { url, qrDataUrl, tableNumber: table.tableNumber };
  }

  // ─── Helper Soft-Block ──────────────────────────────────────────

  /**
   * Block a table (helper soft-block).
   * Prevents other helpers from seating customers at this table.
   * A customer scanning the QR code will auto-clear the block.
   */
  async blockTable(
    tableId: number,
    restaurantId: number,
    userId: string,
    ctx?: AuditContext,
  ) {
    const table = await tableRepository.findById(tableId);
    if (!table) throw new AppError(404, "Table not found");
    if (table.restaurantId !== restaurantId) {
      throw new AppError(403, "Table does not belong to this restaurant");
    }
    if (table.helperBlockedBy) {
      throw new AppError(400, "Table is already blocked");
    }

    const updated = await tableRepository.block(tableId, userId);

    // Audit log
    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "table_blocked",
          entityType: "table",
          entityId: tableId,
          newValue: { blockedBy: userId },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // Emit real-time event
    eventBus.emit(restaurantId, "table_status_changed", {
      tableId,
      tableNumber: table.tableNumber,
      previousStatus: "available",
      currentStatus: "blocked",
    });

    logger.info(
      `Table ${table.tableNumber} blocked by user ${userId} in restaurant ${restaurantId}`,
    );

    return updated;
  }

  /**
   * Unblock a table (remove helper soft-block).
   */
  async unblockTable(
    tableId: number,
    restaurantId: number,
    userId: string,
    ctx?: AuditContext,
  ) {
    const table = await tableRepository.findById(tableId);
    if (!table) throw new AppError(404, "Table not found");
    if (table.restaurantId !== restaurantId) {
      throw new AppError(403, "Table does not belong to this restaurant");
    }
    if (!table.helperBlockedBy) {
      throw new AppError(400, "Table is not blocked");
    }

    const updated = await tableRepository.unblock(tableId);

    // Audit log
    if (ctx) {
      auditService
        .log({
          restaurantId,
          actorUserId: ctx.actorUserId,
          action: "table_unblocked",
          entityType: "table",
          entityId: tableId,
          oldValue: { blockedBy: table.helperBlockedBy },
          ipAddress: ctx.ipAddress,
        })
        .catch(() => {});
    }

    // Emit real-time event
    eventBus.emit(restaurantId, "table_status_changed", {
      tableId,
      tableNumber: table.tableNumber,
      previousStatus: "blocked",
      currentStatus: "available",
    });

    logger.info(
      `Table ${table.tableNumber} unblocked by user ${userId} in restaurant ${restaurantId}`,
    );

    return updated;
  }

  // ─── Force Release ──────────────────────────────────────────────

  /**
   * Force-release a table:
   * 1. Cancel all pending orders on the table's active sessions
   * 2. Force-close all active sessions
   * 3. Clear any helper block
   * 4. Audit log with mandatory reason
   * 5. Emit SSE/FCM events
   */
  async forceReleaseTable(
    tableId: number,
    restaurantId: number,
    userId: string,
    reason: string,
    ctx?: AuditContext,
  ) {
    const table = await tableRepository.findById(tableId);
    if (!table) throw new AppError(404, "Table not found");
    if (table.restaurantId !== restaurantId) {
      throw new AppError(403, "Table does not belong to this restaurant");
    }

    // 1. Find all active sessions on this table
    const activeSessions =
      await sessionRepository.findAllActiveByTable(tableId);

    // 2. Cancel all pending orders for each active session
    let totalCancelledOrders = 0;
    for (const session of activeSessions) {
      const cancelledOrders =
        await orderRepository.cancelPendingBySession(session.id);
      totalCancelledOrders += cancelledOrders.length;

      // Emit order_cancelled events for each cancelled order
      for (const order of cancelledOrders) {
        eventBus.emit(restaurantId, "order_cancelled", {
          orderId: order.id,
          orderNumber: order.orderNumber,
        });
      }
    }

    // 3. Force-close all active sessions
    const closedSessions = await sessionRepository.forceCloseByTable(
      tableId,
      userId,
    );

    // Emit session_closed events for each closed session
    for (const session of closedSessions) {
      eventBus.emit(restaurantId, "session_closed", {
        sessionId: session.id,
        tableId,
        tableNumber: table.tableNumber,
      });
    }

    // 4. Clear helper block if present
    if (table.helperBlockedBy) {
      await tableRepository.unblock(tableId);
    }

    // 5. Audit log with mandatory reason
    if (ctx) {
      await auditService.log({
        restaurantId,
        actorUserId: ctx.actorUserId,
        action: "table_force_released",
        entityType: "table",
        entityId: tableId,
        oldValue: {
          activeSessions: closedSessions.length,
          pendingOrders: totalCancelledOrders,
          wasBlocked: !!table.helperBlockedBy,
        },
        newValue: {
          status: "released",
          closedSessions: closedSessions.length,
          cancelledOrders: totalCancelledOrders,
        },
        reason,
        ipAddress: ctx.ipAddress,
      });
    }

    // Also audit each session force-close
    for (const session of closedSessions) {
      if (ctx) {
        auditService
          .log({
            restaurantId,
            actorUserId: ctx.actorUserId,
            action: "session_force_closed",
            entityType: "session",
            entityId: session.id,
            oldValue: { status: "active" },
            newValue: { status: "closed" },
            reason,
            ipAddress: ctx.ipAddress,
          })
          .catch(() => {});
      }
    }

    // 6. Emit table status change event
    eventBus.emit(restaurantId, "table_status_changed", {
      tableId,
      tableNumber: table.tableNumber,
      previousStatus: "occupied",
      currentStatus: "available",
    });

    logger.info(
      `Table ${table.tableNumber} force-released by ${userId}: ${closedSessions.length} sessions closed, ${totalCancelledOrders} orders cancelled. Reason: ${reason}`,
    );

    return {
      tableId,
      tableNumber: table.tableNumber,
      closedSessions: closedSessions.length,
      cancelledOrders: totalCancelledOrders,
    };
  }
}

export const tableService = new TableService();
