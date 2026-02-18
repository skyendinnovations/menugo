import BaseAPI from './base';
import type {
  RegisterDeviceTokenDTO,
  NotificationSettingsMatrix,
} from '@menugo/dto';

class NotificationAPI extends BaseAPI {
  async registerToken(data: RegisterDeviceTokenDTO) {
    return this.post<{ success: boolean }>(
      '/api/notifications/register-token',
      data
    );
  }

  async unregisterToken(token: string) {
    return this.delete<{ success: boolean }>(
      '/api/notifications/unregister-token',
      { body: JSON.stringify({ token }), headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Notification settings for a restaurant
  async getSettings(restaurantId: number) {
    return this.get<{
      success: boolean;
      data: NotificationSettingsMatrix[];
    }>(`/api/restaurants/${restaurantId}/notification-settings`);
  }

  async updateSettings(
    restaurantId: number,
    settings: Array<{
      triggerEvent: string;
      roleId: number;
      enabled: boolean;
    }>
  ) {
    return this.put<{ success: boolean }>(
      `/api/restaurants/${restaurantId}/notification-settings`,
      { settings }
    );
  }

  async seedDefaults(restaurantId: number) {
    return this.post<{ success: boolean }>(
      `/api/restaurants/${restaurantId}/notification-settings/seed`
    );
  }

  // Order acceptance
  async acceptOrder(restaurantId: number, orderId: number) {
    return this.post<{ success: boolean; data: any }>(
      `/api/restaurants/${restaurantId}/orders/${orderId}/accept`
    );
  }
}

export const notificationAPI = new NotificationAPI();
