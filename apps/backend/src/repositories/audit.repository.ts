import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { db } from "@menugo/data";
import { auditLogs } from "@menugo/data/schemas";
import type {
  AuditAction,
  AuditEntity,
  AuditLogFilters,
} from "@menugo/dto";

interface CreateAuditLogParams {
  restaurantId: number;
  actorUserId: string | null;
  action: AuditAction;
  entityType: AuditEntity;
  entityId: string;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
  ipAddress?: string | null;
}

class AuditRepository {
  async create(params: CreateAuditLogParams) {
    const [entry] = await db
      .insert(auditLogs)
      .values({
        restaurantId: params.restaurantId,
        actorUserId: params.actorUserId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        oldValue: params.oldValue ?? null,
        newValue: params.newValue ?? null,
        reason: params.reason ?? null,
        ipAddress: params.ipAddress ?? null,
      })
      .returning();
    return entry;
  }

  async findByRestaurant(
    restaurantId: number,
    filters: AuditLogFilters = {},
  ) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 50, 100);
    const offset = (page - 1) * limit;

    // Build dynamic WHERE conditions
    const conditions = [eq(auditLogs.restaurantId, restaurantId)];

    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }
    if (filters.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }
    if (filters.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }
    if (filters.actorUserId) {
      conditions.push(eq(auditLogs.actorUserId, filters.actorUserId));
    }
    if (filters.startDate) {
      conditions.push(gte(auditLogs.createdAt, new Date(filters.startDate)));
    }
    if (filters.endDate) {
      conditions.push(lte(auditLogs.createdAt, new Date(filters.endDate)));
    }

    const where = and(...conditions);

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(where),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const auditRepository = new AuditRepository();
