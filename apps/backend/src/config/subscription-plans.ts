export interface SubscriptionPlanConfig {
  name: string;
  slug: string;
  monthlyAmount: number; // in paise
  yearlyAmount: number; // in paise
  currency: string;
  features: string[];
  limits: {
    maxTables: number | null; // null = unlimited
    maxRestaurants: number;
    hasVariants: boolean;
    hasStaffManagement: boolean;
    hasKitchenView: boolean;
    hasWaiterView: boolean;
    hasNotifications: boolean;
    hasAnalytics: boolean;
    hasPrioritySupport: boolean;
  };
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanConfig[] = [
  {
    name: "Starter",
    slug: "starter",
    monthlyAmount: 0,
    yearlyAmount: 0,
    currency: "INR",
    features: [
      "Up to 5 tables",
      "Basic menu management",
      "QR code ordering",
    ],
    limits: {
      maxTables: 5,
      maxRestaurants: 1,
      hasVariants: false,
      hasStaffManagement: false,
      hasKitchenView: false,
      hasWaiterView: false,
      hasNotifications: false,
      hasAnalytics: false,
      hasPrioritySupport: false,
    },
  },
  {
    name: "Professional",
    slug: "professional",
    monthlyAmount: 99900, // ₹999
    yearlyAmount: 999900, // ₹9,999
    currency: "INR",
    features: [
      "Up to 20 tables",
      "Menu variants & modifiers",
      "Staff management",
      "Kitchen & waiter views",
      "Push notifications",
    ],
    limits: {
      maxTables: 20,
      maxRestaurants: 1,
      hasVariants: true,
      hasStaffManagement: true,
      hasKitchenView: true,
      hasWaiterView: true,
      hasNotifications: true,
      hasAnalytics: false,
      hasPrioritySupport: false,
    },
  },
  {
    name: "Enterprise",
    slug: "enterprise",
    monthlyAmount: 299900, // ₹2,999
    yearlyAmount: 2999900, // ₹29,999
    currency: "INR",
    features: [
      "Unlimited tables",
      "Multi-restaurant support",
      "Priority support",
      "Advanced analytics",
      "All Professional features",
    ],
    limits: {
      maxTables: null,
      maxRestaurants: 10,
      hasVariants: true,
      hasStaffManagement: true,
      hasKitchenView: true,
      hasWaiterView: true,
      hasNotifications: true,
      hasAnalytics: true,
      hasPrioritySupport: true,
    },
  },
];
