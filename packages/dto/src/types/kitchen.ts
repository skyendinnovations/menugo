export interface Kitchen {
  id: number;
  restaurantId: number;
  name: string;
  isActive?: boolean;
  memberUserIds?: string[];
}

export interface CreateKitchenDTO {
  name: string;
}

export interface UpdateKitchenDTO {
  name?: string;
  isActive?: boolean;
}
