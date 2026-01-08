export interface CreateRestaurantDTO {
  name: string;
  tableCount?: number;
  workflowSettings?: {
    hasKitchenView: boolean;
    orderFlow: string[];
  };
}

export interface CreateRestaurantDBInput {
  name: string;
  slug: string;
  tableCount?: number;
  workflowSettings?: {
    hasKitchenView: boolean;
    orderFlow: string[];
  };
}