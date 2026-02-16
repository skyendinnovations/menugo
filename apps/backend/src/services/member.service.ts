import { memberRepository } from "../repositories/member.repository";
import { invitationRepository } from "../repositories/invitation.repository";
import { AppError } from "../types";
import type { InviteMemberDTO } from "@menugo/dto";
import { generateId } from "../utils/helpers";
import { db } from "@menugo/data";
import { user as userTable } from "@menugo/data/schemas";
import { eq } from "drizzle-orm";

class MemberService {
  async getMembers(restaurantId: number) {
    const members = await memberRepository.findByRestaurant(restaurantId);
    // Attach roles to each member
    const membersWithRoles = await Promise.all(
      members.map(async (m) => {
        const roles = await memberRepository.getMemberRoles(
          m.userId,
          restaurantId,
        );
        return { ...m, roles };
      }),
    );
    return membersWithRoles;
  }

  async inviteMember(
    restaurantId: number,
    inviterId: string,
    dto: InviteMemberDTO,
  ) {
    // Check if already a member
    const existingByEmail = await this.findUserByEmail(dto.email);
    if (existingByEmail) {
      const existingMember = await memberRepository.findByUserAndRestaurant(
        existingByEmail.id,
        restaurantId,
      );
      if (existingMember) {
        throw new AppError(409, "User is already a member of this restaurant");
      }
    }

    // Check if pending invitation already exists
    const existingInvitation = await invitationRepository.findPendingByEmail(
      restaurantId,
      dto.email,
    );
    if (existingInvitation) {
      throw new AppError(
        409,
        "A pending invitation already exists for this email",
      );
    }

    const token = generateId();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await invitationRepository.create({
      restaurantId,
      email: dto.email,
      roleIds: dto.roleIds,
      token,
      inviterId,
      expiresAt,
    });

    return invitation;
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.validateInvitation(token, userId);

    // Check if user is already a member
    const existingMember = await memberRepository.findByUserAndRestaurant(
      userId,
      invitation.restaurantId,
    );
    if (existingMember) {
      throw new AppError(409, "You are already a member of this restaurant");
    }

    // Create member
    await memberRepository.create(invitation.restaurantId, userId);

    // Add roles
    await memberRepository.addUserRoles(
      userId,
      invitation.restaurantId,
      invitation.roleIds,
    );

    // Update invitation status
    await invitationRepository.updateStatus(invitation.id, "accepted", {
      acceptedByUserId: userId,
      acceptedAt: new Date(),
    });

    return { restaurantId: invitation.restaurantId };
  }

  async rejectInvitation(token: string, userId: string) {
    const invitation = await this.validateInvitation(token, userId);

    await invitationRepository.updateStatus(invitation.id, "rejected");

    return { restaurantId: invitation.restaurantId };
  }

  private async validateInvitation(token: string, userId: string) {
    const invitation = await invitationRepository.findByToken(token);
    if (!invitation) {
      throw new AppError(404, "Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new AppError(
        400,
        `Invitation has already been ${invitation.status}`,
      );
    }

    if (new Date() > invitation.expiresAt) {
      await invitationRepository.updateStatus(invitation.id, "expired");
      throw new AppError(400, "Invitation has expired");
    }

    // Verify the invitation belongs to this user
    const user = await this.findUserById(userId);
    if (!user || user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new AppError(403, "This invitation does not belong to you");
    }

    return invitation;
  }

  async removeMember(memberId: number, restaurantId: number) {
    // Look up the member to get the userId
    const members = await memberRepository.findByRestaurant(restaurantId);
    const member = members.find((m) => m.id === memberId);

    if (!member) {
      throw new AppError(404, "Member not found");
    }

    if (member.isOwner) {
      throw new AppError(400, "Cannot remove the owner");
    }

    // Remove user roles first
    await memberRepository.removeUserRoles(member.userId, restaurantId);

    // Remove member
    return memberRepository.remove(memberId);
  }

  async getMyInvitations(email: string) {
    return invitationRepository.findAllPendingByEmail(email);
  }

  async getInvitations(restaurantId: number) {
    return invitationRepository.findByRestaurant(restaurantId);
  }

  private async findUserByEmail(email: string) {
    const [u] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.email, email.toLowerCase().trim()));
    return u || null;
  }

  private async findUserById(userId: string) {
    const [u] = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId));
    return u || null;
  }
}

export const memberService = new MemberService();
