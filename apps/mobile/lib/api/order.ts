import BaseAPI from './base';
import type { Order, Session } from '@menugo/dto';

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

  async getKitchenOrders(restaurantId: number) {
    return this.get<{ success: boolean; data: Order[] }>(
      `/api/restaurants/${restaurantId}/orders/kitchen`
    );
  }

  async getWaiterOrders(restaurantId: number) {
    return this.get<{ success: boolean; data: Order[] }>(
      `/api/restaurants/${restaurantId}/orders/waiter`
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
