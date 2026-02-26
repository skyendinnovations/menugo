import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import { customerDeviceTokens } from "@menugo/data/schemas";

class CustomerDeviceTokenRepository {
  async findByDeviceId(deviceId: string) {
    return db
      .select()
      .from(customerDeviceTokens)
      .where(
        and(
          eq(customerDeviceTokens.deviceId, deviceId),
          eq(customerDeviceTokens.isActive, true),
        ),
      );
  }

  async upsert(deviceId: string, token: string, deviceType: string) {
    const [existing] = await db
      .select()
      .from(customerDeviceTokens)
      .where(eq(customerDeviceTokens.token, token));

    if (existing) {
      const [updated] = await db
        .update(customerDeviceTokens)
        .set({
          deviceId,
          deviceType,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(customerDeviceTokens.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(customerDeviceTokens)
      .values({ deviceId, token, deviceType })
      .returning();
    return created;
  }

  async deactivate(token: string) {
    await db
      .update(customerDeviceTokens)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(customerDeviceTokens.token, token));
  }
}

export const customerDeviceTokenRepository =
  new CustomerDeviceTokenRepository();
