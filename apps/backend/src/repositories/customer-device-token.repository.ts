import { eq, inArray } from "drizzle-orm";
import { db } from "@menugo/data";
import { customerDeviceTokens } from "@menugo/data/schemas";

class CustomerDeviceTokenRepository {
    async upsert(deviceId: string, token: string, deviceType: string) {
        const [existing] = await db
            .select()
            .from(customerDeviceTokens)
            .where(eq(customerDeviceTokens.token, token));

        if (existing) {
            const [updated] = await db
                .update(customerDeviceTokens)
                .set({ deviceId, deviceType, isActive: true, updatedAt: new Date() })
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

    async findByDeviceId(deviceId: string) {
        return db
            .select()
            .from(customerDeviceTokens)
            .where(eq(customerDeviceTokens.deviceId, deviceId));
    }

    async findByDeviceIds(deviceIds: string[]) {
        if (deviceIds.length === 0) return [];
        return db
            .select()
            .from(customerDeviceTokens)
            .where(inArray(customerDeviceTokens.deviceId, deviceIds));
    }

    async deactivateTokens(tokens: string[]) {
        if (tokens.length === 0) return;
        await db
            .update(customerDeviceTokens)
            .set({ isActive: false, updatedAt: new Date() })
            .where(inArray(customerDeviceTokens.token, tokens));
    }
}

export const customerDeviceTokenRepository = new CustomerDeviceTokenRepository();
