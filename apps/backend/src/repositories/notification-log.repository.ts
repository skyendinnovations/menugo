import { eq, and, sql } from "drizzle-orm";
import { db } from "@menugo/data";
import { notificationLogs } from "@menugo/data/schemas";

interface CreateNotificationLogParams {
  restaurantId: number;
  orderId?: number | null;
  eventType: string;
  recipientRoleIds: number[];
  recipientUserIds: string[];
  fcmSuccessCount: number;
  fcmFailureCount: number;
  payload: Record<string, unknown>;
}

class NotificationLogRepository {
  async create(params: CreateNotificationLogParams) {
    const [log] = await db
      .insert(notificationLogs)
      .values({
        restaurantId: params.restaurantId,
        orderId: params.orderId ?? null,
        eventType: params.eventType,
        recipientRoleIds: params.recipientRoleIds,
        recipientUserIds: params.recipientUserIds,
        fcmSuccessCount: params.fcmSuccessCount,
        fcmFailureCount: params.fcmFailureCount,
        payload: params.payload,
      })
      .returning();
    return log;
  }

  async findByRestaurant(
    restaurantId: number,
    filters: {
      orderId?: number;
      eventType?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { page = 1, limit = 50 } = filters;
    const safeLimit = Math.min(limit, 100);
    const offset = (page - 1) * safeLimit;

    const conditions = [eq(notificationLogs.restaurantId, restaurantId)];

    if (filters.orderId) {
      conditions.push(eq(notificationLogs.orderId, filters.orderId));
    }
    if (filters.eventType) {
      conditions.push(eq(notificationLogs.eventType, filters.eventType));
    }

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationLogs)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    const data = await db
      .select()
      .from(notificationLogs)
      .where(and(...conditions))
      .orderBy(sql`${notificationLogs.sentAt} desc`)
      .limit(safeLimit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}

export const notificationLogRepository = new NotificationLogRepository();
