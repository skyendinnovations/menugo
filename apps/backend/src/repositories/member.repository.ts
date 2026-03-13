import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import {
  restaurantMembers,
  userRoles,
  user as userTable,
  roles,
} from "@menugo/data/schemas";

class MemberRepository {
  async findByRestaurant(restaurantId: number) {
    return db
      .select({
        id: restaurantMembers.id,
        userId: restaurantMembers.userId,
        isOwner: restaurantMembers.isOwner,
        isActive: restaurantMembers.isActive,
        joinedAt: restaurantMembers.joinedAt,
        userName: userTable.name,
        userEmail: userTable.email,
      })
      .from(restaurantMembers)
      .innerJoin(userTable, eq(restaurantMembers.userId, userTable.id))
      .where(eq(restaurantMembers.restaurantId, restaurantId));
  }

  /** Return all memberships for a user across all restaurants. */
  async findAllByUser(userId: string) {
    return db
      .select({
        id: restaurantMembers.id,
        restaurantId: restaurantMembers.restaurantId,
        isOwner: restaurantMembers.isOwner,
        isActive: restaurantMembers.isActive,
      })
      .from(restaurantMembers)
      .where(eq(restaurantMembers.userId, userId));
  }

  async findByUserAndRestaurant(userId: string, restaurantId: number) {
    const [member] = await db
      .select()
      .from(restaurantMembers)
      .where(
        and(
          eq(restaurantMembers.userId, userId),
          eq(restaurantMembers.restaurantId, restaurantId),
        ),
      );
    return member || null;
  }

  async create(restaurantId: number, userId: string, isOwner = false) {
    const [member] = await db
      .insert(restaurantMembers)
      .values({ restaurantId, userId, isOwner })
      .returning();
    return member;
  }

  async addUserRoles(userId: string, restaurantId: number, roleIds: number[]) {
    for (const roleId of roleIds) {
      await db.insert(userRoles).values({ userId, roleId, restaurantId });
    }
  }

  async remove(id: number) {
    const [member] = await db
      .delete(restaurantMembers)
      .where(eq(restaurantMembers.id, id))
      .returning();
    return member;
  }

  async removeUserRoles(userId: string, restaurantId: number) {
    await db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.restaurantId, restaurantId),
        ),
      );
  }

  async getMemberRoles(userId: string, restaurantId: number) {
    return db
      .select({
        roleId: userRoles.roleId,
        roleName: roles.name,
        permissions: roles.permissions,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.restaurantId, restaurantId),
        ),
      );
  }

  async updateUserRoles(
    userId: string,
    restaurantId: number,
    roleIds: number[],
  ) {
    // Remove existing roles then assign new ones
    await this.removeUserRoles(userId, restaurantId);
    if (roleIds.length > 0) {
      await this.addUserRoles(userId, restaurantId, roleIds);
    }
  }
}

export const memberRepository = new MemberRepository();
