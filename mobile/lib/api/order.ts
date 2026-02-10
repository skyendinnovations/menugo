import BaseAPI from './base';

export interface Order {
  id: number;
  restaurantId: number;
  tableSessionId: number;
  orderNumber: string;
  status: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  items: OrderItem[];
  tableNumber?: number;
}

export interface OrderItem {
  id: number;
  orderId: number;
  menuItemId: number;
  itemName: string;
  variantName?: string;
  priceAtOrder: string;
  quantity: number;
  notes?: string;
  status?: string;
}

export interface Session {
  id: number;
  restaurantId: number;
  tableId: number;
  joinCode: string;
  hostDeviceId: string;
  personsCount: number;
  status: string;
  calculatedTotal?: string;
  startTime?: string;
  endTime?: string;
  participants?: any[];
  tableNumber?: number;
}

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
      { method: 'PATCH', body: JSON.stringify({ status }), headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const orderAPI = new OrderAPI();
