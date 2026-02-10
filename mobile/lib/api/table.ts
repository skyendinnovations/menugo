import BaseAPI from './base';

export interface Table {
  id: number;
  restaurantId: number;
  tableNumber: number;
  qrCode?: string;
  capacity: number;
  isActive?: boolean;
  updatedAt?: string;
}

export interface QRData {
  url: string;
  qrDataUrl: string;
  tableNumber: number;
}

class TableAPI extends BaseAPI {
  async getAll(restaurantId: number) {
    return this.get<{ success: boolean; data: Table[] }>(
      `/api/restaurants/${restaurantId}/tables`
    );
  }

  async create(restaurantId: number, tableNumber: number, capacity?: number) {
    return this.post<{ success: boolean; data: Table }>(
      `/api/restaurants/${restaurantId}/tables`,
      { tableNumber, capacity }
    );
  }

  async bulkCreate(restaurantId: number, from: number, to: number, capacity?: number) {
    return this.post<{ success: boolean; data: Table[] }>(
      `/api/restaurants/${restaurantId}/tables/bulk`,
      { from, to, capacity }
    );
  }

  async update(restaurantId: number, tableId: number, data: { capacity?: number; isActive?: boolean }) {
    return this.put<{ success: boolean; data: Table }>(
      `/api/restaurants/${restaurantId}/tables/${tableId}`,
      data
    );
  }

  async remove(restaurantId: number, tableId: number) {
    return this.delete<{ success: boolean }>(
      `/api/restaurants/${restaurantId}/tables/${tableId}`
    );
  }

  async getQR(restaurantId: number, tableId: number) {
    return this.get<{ success: boolean; data: QRData }>(
      `/api/restaurants/${restaurantId}/tables/${tableId}/qr`
    );
  }
}

export const tableAPI = new TableAPI();
