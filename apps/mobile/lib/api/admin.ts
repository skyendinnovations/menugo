import BaseAPI from './base';
import type {
  AdminRestaurantListItem,
  AdminUserListItem,
  PlatformStats,
} from '@menugo/dto';

class AdminAPI extends BaseAPI {
  // Platform stats

  async getStats() {
    return this.get<{ success: boolean; data: PlatformStats }>('/api/admin/stats');
  }

  // Restaurant management

  async getRestaurants(query?: { status?: string }) {
    const params = query?.status ? `?status=${query.status}` : '';
    return this.get<{ success: boolean; data: AdminRestaurantListItem[] }>(
      `/api/admin/restaurants${params}`
    );
  }

  async getRestaurant(id: number) {
    return this.get<{ success: boolean; data: AdminRestaurantListItem }>(
      `/api/admin/restaurants/${id}`
    );
  }

  async suspendRestaurant(id: number, reason: string) {
    return this.put<{ success: boolean; data: AdminRestaurantListItem }>(
      `/api/admin/restaurants/${id}/suspend`,
      { reason }
    );
  }

  async activateRestaurant(id: number, reason?: string) {
    return this.put<{ success: boolean; data: AdminRestaurantListItem }>(
      `/api/admin/restaurants/${id}/activate`,
      { reason }
    );
  }

  // User management

  async getUsers(query?: { status?: string }) {
    const params = query?.status ? `?status=${query.status}` : '';
    return this.get<{ success: boolean; data: AdminUserListItem[] }>(
      `/api/admin/users${params}`
    );
  }

  async getUser(id: string) {
    return this.get<{ success: boolean; data: AdminUserListItem }>(
      `/api/admin/users/${id}`
    );
  }

  async banUser(id: string, reason: string) {
    return this.put<{ success: boolean; data: AdminUserListItem }>(
      `/api/admin/users/${id}/ban`,
      { reason }
    );
  }

  async unbanUser(id: string, reason?: string) {
    return this.put<{ success: boolean; data: AdminUserListItem }>(
      `/api/admin/users/${id}/unban`,
      { reason }
    );
  }
}

export const adminAPI = new AdminAPI();
