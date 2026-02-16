export interface Member {
    id: number;
    userId: string;
    isOwner: boolean;
    isActive: boolean;
    joinedAt: string;
    userName: string;
    userEmail: string;
    roles: { roleId: number; roleName: string; permissions: any }[];
}

export interface Invitation {
    id: number;
    restaurantId: number;
    email: string;
    token: string;
    status: string;
    expiresAt: string;
    roleIds: number[];
}

export interface MyInvitation {
    id: number;
    restaurantId: number;
    restaurantName: string;
    email: string;
    token: string;
    status: string;
    roleIds: number[];
    expiresAt: string;
    createdAt: string;
}

export interface InviteMemberDTO {
    email: string;
    roleIds: number[];
}

export interface AcceptInvitationDTO {
    token: string;
}
