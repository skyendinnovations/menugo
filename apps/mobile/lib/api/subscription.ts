import BaseAPI from './base';

interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  monthlyAmount: number;
  yearlyAmount: number;
  currency: string;
  features: string[];
  limits: {
    maxTables: number | null;
    maxRestaurants: number;
    hasVariants: boolean;
    hasStaffManagement: boolean;
    hasKitchenView: boolean;
    hasWaiterView: boolean;
    hasNotifications: boolean;
    hasAnalytics: boolean;
    hasPrioritySupport: boolean;
  };
  isActive: boolean;
}

interface SubscriptionStatus {
  active: boolean;
  planSlug: string | null;
  interval: string | null;
  expiresAt: string | null;
  subscriptionId: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class SubscriptionAPI extends BaseAPI {
  async getPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
    return this.get('/api/subscription/plans');
  }

  async getStatus(restaurantId: number): Promise<ApiResponse<SubscriptionStatus>> {
    return this.get(`/api/subscription/status?restaurantId=${restaurantId}`);
  }

  async getCheckoutUrl(
    restaurantId: number,
    planSlug: string,
    interval: 'monthly' | 'yearly',
  ): Promise<ApiResponse<{ url: string }>> {
    return this.post('/api/subscription/checkout-url', {
      restaurantId,
      planSlug,
      interval,
    });
  }
}

export const subscriptionAPI = new SubscriptionAPI();
export type { SubscriptionPlan, SubscriptionStatus };
