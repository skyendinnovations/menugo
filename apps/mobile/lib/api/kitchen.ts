import BaseAPI from './base';
import type { Kitchen } from '@menugo/dto';

class KitchenAPI extends BaseAPI {
  list(restaurantId: number) { return this.get<{success:boolean;data:Kitchen[]}>(`/api/restaurants/${restaurantId}/menu/kitchens`); }
  create(restaurantId: number, name: string) { return this.post<{success:boolean;data:Kitchen}>(`/api/restaurants/${restaurantId}/menu/kitchens`, { name }); }
  update(restaurantId: number, kitchenId: number, data: {name?:string;isActive?:boolean}) { return this.put<{success:boolean;data:Kitchen}>(`/api/restaurants/${restaurantId}/menu/kitchens/${kitchenId}`, data); }
  remove(restaurantId: number, kitchenId: number) { return super.delete<{success:boolean}>(`/api/restaurants/${restaurantId}/menu/kitchens/${kitchenId}`); }
  addMember(restaurantId: number, kitchenId: number, userId: string) { return this.post<{success:boolean}>(`/api/restaurants/${restaurantId}/menu/kitchens/${kitchenId}/members`, { userId }); }
  removeMember(restaurantId: number, kitchenId: number, userId: string) { return super.delete<{success:boolean}>(`/api/restaurants/${restaurantId}/menu/kitchens/${kitchenId}/members/${userId}`); }
}

export const kitchenAPI = new KitchenAPI();
