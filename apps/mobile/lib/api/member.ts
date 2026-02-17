import BaseAPI from './base';
import type { Member, Role, Invitation, MyInvitation, MyMembership } from '@menugo/dto';

class MemberAPI extends BaseAPI {
  // Members
  async getMembers(restaurantId: number) {
    return this.get<{ success: boolean; data: Member[] }>(
      `/api/restaurants/${restaurantId}/members`
    );
  }

  async getMyMembership(restaurantId: number) {
    return this.get<{ success: boolean; data: MyMembership }>(
      `/api/restaurants/${restaurantId}/members/me`
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
    return this.get<{ success: boolean; data: MyInvitation[] }>('/api/invitations/my');
  }

  async acceptInvitation(token: string) {
    return this.post<{ success: boolean; data: any }>('/api/invitations/accept', { token });
  }

  async rejectInvitation(token: string) {
    return this.post<{ success: boolean; data: any }>('/api/invitations/reject', { token });
  }

  // Roles
  async getRoles(restaurantId: number) {
    return this.get<{ success: boolean; data: Role[] }>(`/api/restaurants/${restaurantId}/roles`);
  }

  async createRole(restaurantId: number, name: string, permissions: Record<string, boolean>) {
    return this.post<{ success: boolean; data: Role }>(`/api/restaurants/${restaurantId}/roles`, {
      name,
      permissions,
    });
  }

  async updateRole(
    restaurantId: number,
    roleId: number,
    data: { name?: string; permissions?: Record<string, boolean> }
  ) {
    return this.put<{ success: boolean; data: Role }>(
      `/api/restaurants/${restaurantId}/roles/${roleId}`,
      data
    );
  }

  async deleteRole(restaurantId: number, roleId: number) {
    return this.delete<{ success: boolean }>(
      `/api/restaurants/${restaurantId}/roles/${roleId}`
    );
  }
}

export const memberAPI = new MemberAPI();
