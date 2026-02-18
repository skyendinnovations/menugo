import { eq, and, inArray } from "drizzle-orm";
import { db } from "@menugo/data";
import { deviceTokens } from "@menugo/data/schemas";

class DeviceTokenRepository {
    async findByUser(userId: string) {
        return db
            .select()
            .from(deviceTokens)
            .where(
                and(
                    eq(deviceTokens.userId, userId),
                    eq(deviceTokens.isActive, true)
                )
            );
    }

    async findByUsers(userIds: string[]) {
        if (userIds.length === 0) return [];
        return db
            .select()
            .from(deviceTokens)
            .where(
                and(
                    inArray(deviceTokens.userId, userIds),
                    eq(deviceTokens.isActive, true)
                )
            );
    }

    async upsert(
        userId: string,
        token: string,
        deviceType: string,
        deviceName?: string
    ) {
        // Check if token exists (could belong to another user if they signed out/in)
        const [existing] = await db
            .select()
            .from(deviceTokens)
            .where(eq(deviceTokens.token, token));

        if (existing) {
            // Update ownership and reactivate
            const [updated] = await db
                .update(deviceTokens)
                .set({
                    userId,
                    deviceType,
                    deviceName,
                    isActive: true,
                    updatedAt: new Date(),
                })
                .where(eq(deviceTokens.id, existing.id))
                .returning();
            return updated;
        }

        const [created] = await db
            .insert(deviceTokens)
            .values({ userId, token, deviceType, deviceName })
            .returning();
        return created;
    }

    async deactivate(token: string) {
        await db
            .update(deviceTokens)
            .set({ isActive: false, updatedAt: new Date() })
            .where(eq(deviceTokens.token, token));
    }

    async deactivateTokens(tokens: string[]) {
        if (tokens.length === 0) return;
        await db
            .update(deviceTokens)
            .set({ isActive: false, updatedAt: new Date() })
            .where(inArray(deviceTokens.token, tokens));
    }

    async deleteByToken(token: string) {
        await db
            .delete(deviceTokens)
            .where(eq(deviceTokens.token, token));
    }
}

export const deviceTokenRepository = new DeviceTokenRepository();
