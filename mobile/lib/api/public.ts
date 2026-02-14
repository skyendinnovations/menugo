import type { FullMenuCategory } from './menu';

class PublicAPI {
  private baseURL = process.env.EXPO_PUBLIC_API_URL;

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getMenu(slug: string) {
    return this.request<{
      success: boolean;
      data: {
        restaurant: { id: number; name: string; slug: string; description?: string; logo?: string; currency?: string };
        menu: FullMenuCategory[];
      };
    }>(`/api/public/${slug}/menu`);
  }

  async getTableInfo(slug: string, tableNumber: number, deviceId?: string) {
    const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : '';
    return this.request<{
      success: boolean;
      data: {
        restaurant: { id: number; name: string; slug: string; description?: string; logo?: string; currency?: string };
        table: {
          tableId: number;
          tableNumber: number;
          capacity: number;
          occupiedSeats: number;
          availableSeats: number;
          isFull: boolean;
          activeSessionCount: number;
          existingSessionId?: number;
        };
      };
    }>(`/api/public/${slug}/${tableNumber}/info${query}`);
  }

  async createOrGetSession(slug: string, tableNumber: number, deviceId: string, personsCount?: number, customerName?: string) {
    return this.request<{ success: boolean; data: any }>(
      `/api/public/${slug}/${tableNumber}/session`,
      { method: 'POST', body: JSON.stringify({ deviceId, personsCount, customerName }) }
    );
  }

  async joinSession(joinCode: string, deviceId: string, participantName?: string) {
    return this.request<{ success: boolean; data: any }>(
      '/api/public/session/join',
      { method: 'POST', body: JSON.stringify({ joinCode, deviceId, participantName }) }
    );
  }

  async getSessionStatus(sessionId: number) {
    return this.request<{ success: boolean; data: any }>(
      `/api/public/session/${sessionId}`
    );
  }

  async placeOrder(sessionId: number, deviceId: string, items: any[], notes?: string) {
    return this.request<{ success: boolean; data: any }>(
      `/api/public/session/${sessionId}/order`,
      { method: 'POST', body: JSON.stringify({ deviceId, items, notes }) }
    );
  }

  async getSessionOrders(sessionId: number) {
    return this.request<{ success: boolean; data: any[] }>(
      `/api/public/session/${sessionId}/orders`
    );
  }
}

export const publicAPI = new PublicAPI();
