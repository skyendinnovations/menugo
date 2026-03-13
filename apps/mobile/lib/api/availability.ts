import BaseAPI from "./base";

class AvailabilityAPI extends BaseAPI {
  async clockIn(restaurantId: number) {
    return this.post<{ success: boolean; data: any }>(
      `/api/restaurants/${restaurantId}/staff/clock-in`,
    );
  }

  async clockOut(restaurantId: number) {
    return this.post<{ success: boolean; data: any }>(
      `/api/restaurants/${restaurantId}/staff/clock-out`,
    );
  }

  async getMyStatus(restaurantId: number) {
    return this.get<{
      success: boolean;
      data: {
        isClockedIn: boolean;
        clockedInAt: string | null;
        clockedOutAt: string | null;
      };
    }>(`/api/restaurants/${restaurantId}/staff/my-status`);
  }

  async getAvailability(restaurantId: number) {
    return this.get<{
      success: boolean;
      data: {
        available: Array<{
          userId: string;
          userName: string;
          status: string;
        }>;
        unavailable: Array<{
          userId: string;
          userName: string;
          status: string;
        }>;
        total: number;
      };
    }>(`/api/restaurants/${restaurantId}/staff/availability`);
  }
}

export const availabilityAPI = new AvailabilityAPI();
