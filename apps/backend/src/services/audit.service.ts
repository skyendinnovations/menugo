import { auditRepository } from "../repositories/audit.repository";
import type {
  AuditAction,
  AuditEntity,
  AuditLogFilters,
} from "@menugo/dto";
import { logger } from "../utils/logger";

interface AuditLogParams {
  restaurantId: number;
  actorUserId: string | null;
  action: AuditAction;
  entityType: AuditEntity;
  entityId: string | number;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
}

class AuditService {
  /**
   * Record an audit log entry.
   *
   * This method is intentionally fire-and-forget safe — callers should
   * `await` it when the log is critical (e.g. force actions with reason),
   * and may `.catch()` it otherwise to keep the happy path fast.
   */
  async log(params: AuditLogParams) {
    try {
      return await auditRepository.create({
        ...params,
        entityId: String(params.entityId),
      });
    } catch (error) {
      // Audit failures must NEVER break the main operation.
      logger.error("Failed to write audit log", {
        error,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
      });
      return null;
    }
  }

  /**
   * Query audit logs for a restaurant with pagination and filters.
   */
  async getLogs(restaurantId: number, filters: AuditLogFilters = {}) {
    return auditRepository.findByRestaurant(restaurantId, filters);
  }
}

export const auditService = new AuditService();
