import BaseAPI from './base';
import type { Table, QRData } from '@menugo/dto';

class TableAPI extends BaseAPI {
  async getAll(restaurantId: number) {
    return this.get<{ success: boolean; data: Table[] }>(`/api/restaurants/${restaurantId}/tables`);
  }

  async create(restaurantId: number, tableNumber: number, capacity?: number) {
    return this.post<{ success: boolean; data: Table }>(`/api/restaurants/${restaurantId}/tables`, {
      tableNumber,
      capacity,
    });
  }

  async bulkCreate(restaurantId: number, from: number, to: number, capacity?: number) {
    return this.post<{ success: boolean; data: Table[] }>(
      `/api/restaurants/${restaurantId}/tables/bulk`,
      { from, to, capacity }
    );
  }

  async update(
    restaurantId: number,
    tableId: number,
    data: { capacity?: number; isActive?: boolean }
  ) {
    return this.put<{ success: boolean; data: Table }>(
      `/api/restaurants/${restaurantId}/tables/${tableId}`,
      data
    );
  }

  async remove(restaurantId: number, tableId: number) {
    return this.delete<{ success: boolean }>(`/api/restaurants/${restaurantId}/tables/${tableId}`);
  }

  async getQR(restaurantId: number, tableId: number) {
    return this.get<{ success: boolean; data: QRData }>(
      `/api/restaurants/${restaurantId}/tables/${tableId}/qr`
    );
  }

  async blockTable(restaurantId: number, tableId: number) {
    return this.patch<{ success: boolean }>(
      `/api/restaurants/${restaurantId}/tables/${tableId}/block`,
      {}
    );
  }

  async unblockTable(restaurantId: number, tableId: number) {
    return this.patch<{ success: boolean }>(
      `/api/restaurants/${restaurantId}/tables/${tableId}/unblock`,
      {}
    );
  }

  async forceRelease(restaurantId: number, tableId: number, reason: string) {
    return this.post<{ success: boolean; message: string }>(
      `/api/restaurants/${restaurantId}/tables/${tableId}/force-release`,
      { reason }
    );
  }
}

export const tableAPI = new TableAPI();
