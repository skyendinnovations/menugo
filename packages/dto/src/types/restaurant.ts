export interface Restaurant {
    id: number;
    name: string;
    slug: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logo?: string;
    currency: string;
    tableCountRange?: string;
    workersCount?: number;
    seatingCapacity?: number;
    workflowSettings: any;
    operatingHours?: any;
    isDemoMode?: boolean;
    isActive?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateRestaurantData {
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
    currency?: string;
    tableCountRange?: string;
    workersCount?: number;
    seatingCapacity?: number;
}
