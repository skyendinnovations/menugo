import BaseAPI from './base';

export interface Restaurant {
  id: number;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  tableCountRange?: string;
  workersCount?: number;
  seatingCapacity?: number;
  workflowSettings: any;
  operatingHours?: any;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRestaurantData {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  tableCountRange?: string;
  workersCount?: number;
  seatingCapacity?: number;
}

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
