import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import { roles } from "@menugo/data/schemas";
import type { Permissions } from "@menugo/dto";
import { DEFAULT_ROLE_TEMPLATES } from "@menugo/dto";

class RoleRepository {
  async findByRestaurant(restaurantId: number) {
    return db.select().from(roles).where(eq(roles.restaurantId, restaurantId));
  }

  async findById(id: number) {
    const [role] = await db.select().from(roles).where(eq(roles.id, id));
    return role || null;
  }

  async findByName(restaurantId: number, name: string) {
    const [role] = await db
      .select()
      .from(roles)
      .where(and(eq(roles.restaurantId, restaurantId), eq(roles.name, name)));
    return role || null;
  }

  async create(restaurantId: number, name: string, permissions: Permissions) {
    const [role] = await db
      .insert(roles)
      .values({ restaurantId, name, permissions })
      .returning();
    return role;
  }

  async update(
    id: number,
    data: { name?: string; permissions?: Permissions; isActive?: boolean },
  ) {
    const [role] = await db
      .update(roles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(roles.id, id))
      .returning();
    return role;
  }

  async delete(id: number) {
    const [role] = await db.delete(roles).where(eq(roles.id, id)).returning();
    return role;
  }

  async seedDefaultRoles(restaurantId: number) {
    const results = [];
    for (const template of DEFAULT_ROLE_TEMPLATES) {
      // Check if role already exists
      const existing = await this.findByName(restaurantId, template.name);
      if (!existing) {
        const role = await this.create(
          restaurantId,
          template.name,
          template.permissions,
        );
        results.push(role);
      } else {
        results.push(existing);
      }
    }
    return results;
  }
}

export const roleRepository = new RoleRepository();
