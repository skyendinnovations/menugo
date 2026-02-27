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

  async getAvailability(restaurantId: number) {
    return this.get<{
      success: boolean;
      data: Array<{
        userId: string;
        userName: string;
        isClockedIn: boolean;
        lastClockIn: string | null;
        lastClockOut: string | null;
      }>;
    }>(`/api/restaurants/${restaurantId}/staff/availability`);
  }
}

export const availabilityAPI = new AvailabilityAPI();
