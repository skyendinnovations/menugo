import BaseAPI from './base';

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

export interface Role {
  id: number;
  restaurantId: number;
  name: string;
  permissions: Record<string, boolean>;
  isActive?: boolean;
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

class MemberAPI extends BaseAPI {
  // Members
  async getMembers(restaurantId: number) {
    return this.get<{ success: boolean; data: Member[] }>(
      `/api/restaurants/${restaurantId}/members`
    );
  }

  async inviteMember(restaurantId: number, email: string, roleIds: number[]) {
    return this.post<{ success: boolean; data: Invitation }>(
      `/api/restaurants/${restaurantId}/members/invite`,
      { email, roleIds }
    );
  }

  async removeMember(restaurantId: number, memberId: number) {
    return this.delete<{ success: boolean }>(
      `/api/restaurants/${restaurantId}/members/${memberId}`
    );
  }

  async getInvitations(restaurantId: number) {
    return this.get<{ success: boolean; data: Invitation[] }>(
      `/api/restaurants/${restaurantId}/members/invitations`
    );
  }

  async getMyInvitations() {
    return this.get<{ success: boolean; data: MyInvitation[] }>(
      '/api/invitations/my'
    );
  }

  async acceptInvitation(token: string) {
    return this.post<{ success: boolean; data: any }>(
      '/api/invitations/accept',
      { token }
    );
  }

  async rejectInvitation(token: string) {
    return this.post<{ success: boolean; data: any }>(
      '/api/invitations/reject',
      { token }
    );
  }

  // Roles
  async getRoles(restaurantId: number) {
    return this.get<{ success: boolean; data: Role[] }>(
      `/api/restaurants/${restaurantId}/roles`
    );
  }

  async createRole(restaurantId: number, name: string, permissions: Record<string, boolean>) {
    return this.post<{ success: boolean; data: Role }>(
      `/api/restaurants/${restaurantId}/roles`,
      { name, permissions }
    );
  }
}

export const memberAPI = new MemberAPI();
