import BaseAPI from './base';
import type { MenuCategory, MenuItem, MenuItemVariant } from '@menugo/dto';

class MenuAPI extends BaseAPI {
  async getCategories(restaurantId: number) {
    return this.get<{ success: boolean; data: MenuCategory[] }>(
      `/api/restaurants/${restaurantId}/menu/categories`
    );
  }

  async createCategory(restaurantId: number, name: string, displayOrder?: number) {
    return this.post<{ success: boolean; data: MenuCategory }>(
      `/api/restaurants/${restaurantId}/menu/categories`,
      { name, displayOrder }
    );
  }

  async updateCategory(
    restaurantId: number,
    categoryId: number,
    data: { name?: string; displayOrder?: number }
  ) {
    return this.put<{ success: boolean; data: MenuCategory }>(
      `/api/restaurants/${restaurantId}/menu/categories/${categoryId}`,
      data
    );
  }

  async deleteCategory(restaurantId: number, categoryId: number) {
    return this.delete<{ success: boolean }>(
      `/api/restaurants/${restaurantId}/menu/categories/${categoryId}`
    );
  }

  async getItemsByCategory(restaurantId: number, categoryId: number) {
    return this.get<{ success: boolean; data: MenuItem[] }>(
      `/api/restaurants/${restaurantId}/menu/categories/${categoryId}/items`
    );
  }

  async getItem(restaurantId: number, itemId: number) {
    return this.get<{ success: boolean; data: MenuItem }>(
      `/api/restaurants/${restaurantId}/menu/items/${itemId}`
    );
  }

  async createItem(
    restaurantId: number,
    data: {
      categoryId: number;
      name: string;
      price: string;
      description?: string;
      isVeg?: boolean;
      hasVariants?: boolean;
      variants?: { name: string; price: string }[];
      kitchenId?: number | null;
    }
  ) {
    return this.post<{ success: boolean; data: MenuItem }>(
      `/api/restaurants/${restaurantId}/menu/items`,
      data
    );
  }

  async updateItem(restaurantId: number, itemId: number, data: Partial<MenuItem>) {
    return this.put<{ success: boolean; data: MenuItem }>(
      `/api/restaurants/${restaurantId}/menu/items/${itemId}`,
      data
    );
  }

  async toggleAvailability(restaurantId: number, itemId: number) {
    return this.request<{ success: boolean; data: MenuItem }>(
      `/api/restaurants/${restaurantId}/menu/items/${itemId}/availability`,
      { method: 'PATCH' }
    );
  }

  async deleteItem(restaurantId: number, itemId: number) {
    return this.delete<{ success: boolean }>(
      `/api/restaurants/${restaurantId}/menu/items/${itemId}`
    );
  }

  async createVariant(restaurantId: number, itemId: number, name: string, price: string) {
    return this.post<{ success: boolean; data: MenuItemVariant }>(
      `/api/restaurants/${restaurantId}/menu/items/${itemId}/variants`,
      { name, price }
    );
  }

  async updateVariant(
    restaurantId: number,
    variantId: number,
    data: { name?: string; price?: string }
  ) {
    return this.put<{ success: boolean; data: MenuItemVariant }>(
      `/api/restaurants/${restaurantId}/menu/variants/${variantId}`,
      data
    );
  }

  async deleteVariant(restaurantId: number, variantId: number) {
    return this.delete<{ success: boolean }>(
      `/api/restaurants/${restaurantId}/menu/variants/${variantId}`
    );
  }
}

export const menuAPI = new MenuAPI();
