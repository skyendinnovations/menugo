export interface CreateCategoryDTO {
  name: string;
  displayOrder?: number;
}

export interface UpdateCategoryDTO {
  name?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateMenuItemDTO {
  categoryId: number;
  name: string;
  description?: string;
  price: string;
  isVeg?: boolean;
  imagePath?: string;
  hasVariants?: boolean;
  variants?: CreateVariantDTO[];
}

export interface UpdateMenuItemDTO {
  categoryId?: number;
  name?: string;
  description?: string;
  price?: string;
  isVeg?: boolean;
  imagePath?: string;
  isAvailable?: boolean;
  isActive?: boolean;
  hasVariants?: boolean;
}

export interface CreateVariantDTO {
  name: string;
  price: string;
}

export interface UpdateVariantDTO {
  name?: string;
  price?: string;
  isActive?: boolean;
}
