import BaseAPI from "./base";

class AuditAPI extends BaseAPI {
  async getLogs(
    restaurantId: number,
    filters: {
      action?: string;
      entityType?: string;
      entityId?: string;
      actorUserId?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const params = new URLSearchParams();
    if (filters.action) params.set("action", filters.action);
    if (filters.entityType) params.set("entityType", filters.entityType);
    if (filters.entityId) params.set("entityId", filters.entityId);
    if (filters.actorUserId) params.set("actorUserId", filters.actorUserId);
    if (filters.startDate) params.set("startDate", filters.startDate);
    if (filters.endDate) params.set("endDate", filters.endDate);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));

    const qs = params.toString();
    return this.get<{
      success: boolean;
      data: any[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/api/restaurants/${restaurantId}/audit-logs${qs ? `?${qs}` : ""}`);
  }
}

export const auditAPI = new AuditAPI();
