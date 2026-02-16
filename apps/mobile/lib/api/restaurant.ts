import BaseAPI from './base';
import type { Restaurant, CreateRestaurantData } from '@menugo/dto';

class RestaurantAPI extends BaseAPI {
  async getAll() {
    return this.get<{ success: boolean; data: Restaurant[] }>('/api/restaurants');
  }

  async getById(id: number) {
    return this.get<{ success: boolean; data: Restaurant }>(`/api/restaurants/${id}`);
  }

  async create(data: CreateRestaurantData) {
    return this.post<{ success: boolean; data: Restaurant }>('/api/restaurants', data);
  }

  async update(id: number, data: Partial<CreateRestaurantData>) {
    return this.put<{ success: boolean; data: Restaurant }>(`/api/restaurants/${id}`, data);
  }

  async remove(id: number) {
    return this.delete<{ success: boolean }>(`/api/restaurants/${id}`);
  }
}

export const restaurantAPI = new RestaurantAPI();
