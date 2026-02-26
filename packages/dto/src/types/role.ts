import type { Permissions } from "../constants/permissions";

export interface Role {
    id: number;
    restaurantId: number;
    name: string;
    permissions: Record<string, boolean>;
    isActive?: boolean;
}

export interface CreateRoleDTO {
    name: string;
    permissions: Permissions;
}

export interface UpdateRoleDTO {
    name?: string;
    permissions?: Permissions;
    isActive?: boolean;
}

export interface UpdatePermissionsDTO {
    permissions: Permissions;
}
