import BaseAPI from './base';
import type { Order, Session } from '@menugo/dto';

// ─── Response-shape types for Part-4 purpose-built endpoints ────────────────

/** A single item within a cashier-view order. */
export interface CashierOrderItem {
  id: number;
  itemName: string;
  variantName: string | null;
  quantity: number | null;
  priceAtOrder: string;
  status: string | null;
}

/** A single order within a cashier-view session. */
export interface CashierOrder {
  id: number;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string | null;
  items: CashierOrderItem[];
}

/** One session entry returned by GET /orders/cashier. */
export interface CashierSession {
  sessionId: number;
  tableId: number;
  tableNumber: number;
  sessionStartedAt: string | null;
  orders: CashierOrder[];
}

/** Minimal order row returned by GET /orders/overview. */
export interface OrderOverview {
  id: number;
  orderNumber: string;
  status: string | null;
  tableNumber: number | null;
  acceptedBy: string | null;
  claimedBy: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// ─── API client ──────────────────────────────────────────────────────────────

class OrderAPI extends BaseAPI {
  // Sessions
  async getSessions(restaurantId: number, active?: boolean) {
    const query = active ? '?active=true' : '';
    return this.get<{ success: boolean; data: any[] }>(
      `/api/restaurants/${restaurantId}/sessions${query}`
    );
  }

  async getSession(restaurantId: number, sessionId: number) {
    return this.get<{ success: boolean; data: Session }>(
      `/api/restaurants/${restaurantId}/sessions/${sessionId}`
    );
  }

  async closeSession(restaurantId: number, sessionId: number) {
    return this.post<{ success: boolean; data: Session }>(
      `/api/restaurants/${restaurantId}/sessions/${sessionId}/close`
    );
  }

  // Orders
  async getOrders(restaurantId: number, status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.get<{ success: boolean; data: Order[] }>(
      `/api/restaurants/${restaurantId}/orders${query}`
    );
  }

  async getOrder(restaurantId: number, orderId: number) {
    return this.get<{ success: boolean; data: Order }>(
      `/api/restaurants/${restaurantId}/orders/${orderId}`
    );
  }

  async getKitchenOrders(restaurantId: number, signal?: AbortSignal) {
    return this.get<{ success: boolean; data: Order[] }>(
      `/api/restaurants/${restaurantId}/orders/kitchen`,
      { signal },
    );
  }

  async getWaiterOrders(restaurantId: number) {
    return this.get<{ success: boolean; data: Order[] }>(
      `/api/restaurants/${restaurantId}/orders/waiter`
    );
  }

  /**
   * Delivery list: orders in the workflow-driven statuses that feed "served".
   * Backed by GET /orders/delivery (requirePermission order_deliver).
   */
  async getDeliveryOrders(restaurantId: number, signal?: AbortSignal) {
    return this.get<{ success: boolean; data: Order[] }>(
      `/api/restaurants/${restaurantId}/orders/delivery`,
      { signal },
    );
  }

  /**
   * Cashier view: active sessions with their non-cancelled orders, grouped
   * for the bill modal.
   * Backed by GET /orders/cashier (requirePermission close_sessions).
   */
  async getCashierOrders(restaurantId: number) {
    return this.get<{ success: boolean; data: CashierSession[] }>(
      `/api/restaurants/${restaurantId}/orders/cashier`
    );
  }

  /**
   * Orders overview: minimal fields, no items array.
   * Optional status filter; excludes terminal states by default.
   * Backed by GET /orders/overview (requirePermission view_orders).
   */
  async getOrdersOverview(restaurantId: number, status?: string, signal?: AbortSignal) {
    const query = status ? `?status=${status}` : '';
    return this.get<{ success: boolean; data: OrderOverview[] }>(
      `/api/restaurants/${restaurantId}/orders/overview${query}`,
      { signal },
    );
  }

  async updateOrderStatus(restaurantId: number, orderId: number, status: string) {
    return this.request<{ success: boolean; data: Order }>(
      `/api/restaurants/${restaurantId}/orders/${orderId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  async voidOrder(restaurantId: number, orderId: number, reason: string) {
    return this.post<{ success: boolean; data: Order }>(
      `/api/restaurants/${restaurantId}/orders/${orderId}/void`,
      { reason }
    );
  }

  async modifyOrderItem(
    restaurantId: number,
    orderId: number,
    itemId: number,
    data: { quantity?: number; removed?: boolean }
  ) {
    return this.put<{ success: boolean; data: Order }>(
      `/api/restaurants/${restaurantId}/orders/${orderId}/items/${itemId}`,
      data
    );
  }

  async claimOrder(restaurantId: number, orderId: number) {
    return this.post<{ success: boolean; data: Order }>(
      `/api/restaurants/${restaurantId}/orders/${orderId}/claim`
    );
  }

  async resendNotification(restaurantId: number, orderId: number) {
    return this.post<{ success: boolean; message: string }>(
      `/api/restaurants/${restaurantId}/orders/${orderId}/resend-notification`
    );
  }
}

export const orderAPI = new OrderAPI();
