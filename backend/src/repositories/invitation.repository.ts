import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { restaurantInvitations } from "../db/schemas/invitation.schema";

class InvitationRepository {
  async findById(id: number) {
    const [invitation] = await db
      .select()
      .from(restaurantInvitations)
      .where(eq(restaurantInvitations.id, id));
    return invitation || null;
  }

  async findByToken(token: string) {
    const [invitation] = await db
      .select()
      .from(restaurantInvitations)
      .where(eq(restaurantInvitations.token, token));
    return invitation || null;
  }

  async findByRestaurant(restaurantId: number) {
    return db
      .select()
      .from(restaurantInvitations)
      .where(eq(restaurantInvitations.restaurantId, restaurantId));
  }

  async findPendingByEmail(restaurantId: number, email: string) {
    const [invitation] = await db
      .select()
      .from(restaurantInvitations)
      .where(
        and(
          eq(restaurantInvitations.restaurantId, restaurantId),
          eq(restaurantInvitations.email, email),
          eq(restaurantInvitations.status, "pending")
        )
      );
    return invitation || null;
  }

  async create(data: {
    restaurantId: number;
    email: string;
    roleIds: number[];
    token: string;
    inviterId: string;
    expiresAt: Date;
  }) {
    const [invitation] = await db
      .insert(restaurantInvitations)
      .values(data)
      .returning();
    return invitation;
  }

  async updateStatus(
    id: number,
    status: "pending" | "accepted" | "rejected" | "expired",
    extra?: { acceptedByUserId?: string; acceptedAt?: Date }
  ) {
    const [invitation] = await db
      .update(restaurantInvitations)
      .set({ status, ...extra })
      .where(eq(restaurantInvitations.id, id))
      .returning();
    return invitation;
  }

  async delete(id: number) {
    const [invitation] = await db
      .delete(restaurantInvitations)
      .where(eq(restaurantInvitations.id, id))
      .returning();
    return invitation;
  }
}

export const invitationRepository = new InvitationRepository();
