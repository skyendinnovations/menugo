// ─── Platform Admin Types ───────────────────────────────────────────

export interface AdminRestaurantListItem {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  email: string | null;
  phone: string | null;
  currency: string;
  isActive: boolean | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  memberCount: number;
  tableCount: number;
  orderCount: number;
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  image: string | null;
  banned: boolean;
  isSuperAdmin: boolean | null;
  isActive: boolean | null;
  createdAt: Date;
  restaurantCount: number;
}

export interface PlatformStats {
  totalRestaurants: number;
  activeRestaurants: number;
  suspendedRestaurants: number;
  totalUsers: number;
  bannedUsers: number;
  totalOrders: number;
}

export interface SuspendRestaurantDTO {
  reason: string;
}

export interface ActivateRestaurantDTO {
  reason?: string;
}

export interface AdminBanUserDTO {
  reason: string;
}

export interface AdminUnbanUserDTO {
  reason?: string;
}
