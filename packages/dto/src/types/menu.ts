export interface MenuCategory {
    id: number;
    restaurantId: number;
    name: string;
    displayOrder: number;
    isActive?: boolean;
}

export interface MenuItem {
    id: number;
    restaurantId: number;
    categoryId: number;
    name: string;
    description?: string;
    price: string;
    isVeg?: boolean;
    imagePath?: string;
    isAvailable?: boolean;
    isActive?: boolean;
    hasVariants?: boolean;
    kitchenId?: number | null;
    variants?: MenuItemVariant[];
}

export interface MenuItemVariant {
    id: number;
    menuItemId: number;
    name: string;
    price: string;
    isActive?: boolean;
}

export interface FullMenuCategory extends MenuCategory {
    items: (MenuItem & { variants: MenuItemVariant[] })[];
}

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
    kitchenId?: number;
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
    kitchenId?: number | null;
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
