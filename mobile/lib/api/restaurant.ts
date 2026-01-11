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
    tableCountRange?: 'under_10' | '10_to_20' | '20_to_40' | '40_to_50';
    workersCount?: number;
    seatingCapacity?: number;
    workflowSettings?: {
        hasKitchenView?: boolean;
        orderFlow?: string[];
    };
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
    website?: string;
    logo?: string;
    tableCountRange?: 'under_10' | '10_to_20' | '20_to_40' | '40_to_50';
    workersCount?: number;
    seatingCapacity?: number;
    operatingHours?: any;
    isActive?: boolean;
}

export interface RestaurantResponse {
    success: boolean;
    message: string;
    data: Restaurant;
}

export interface RestaurantsResponse {
    success: boolean;
    message: string;
    data: Restaurant[];
}

class RestaurantAPI extends BaseAPI {
    async createRestaurant(data: CreateRestaurantData): Promise<RestaurantResponse> {
        return this.post<RestaurantResponse>('/api/restaurants', data);
    }

    async getRestaurants(): Promise<RestaurantsResponse> {
        return this.get<RestaurantsResponse>('/api/restaurants');
    }

    async getRestaurantById(id: number): Promise<RestaurantResponse> {
        return this.get<RestaurantResponse>(`/api/restaurants/${id}`);
    }

    async updateRestaurant(id: number, data: Partial<CreateRestaurantData>): Promise<RestaurantResponse> {
        return this.put<RestaurantResponse>(`/api/restaurants/${id}`, data);
    }

    async deleteRestaurant(id: number): Promise<{ success: boolean; message: string }> {
        return this.request<{ success: boolean; message: string }>(`/api/restaurants/${id}`, {
            method: 'DELETE',
        });
    }
}

export const restaurantAPI = new RestaurantAPI();
