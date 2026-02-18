import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import { notificationSettings, roles } from "@menugo/data/schemas";
import type { NotificationTriggerEvent } from "@menugo/dto";

class NotificationSettingsRepository {
    async findByRestaurant(restaurantId: number) {
        return db
            .select({
                id: notificationSettings.id,
                restaurantId: notificationSettings.restaurantId,
                triggerEvent: notificationSettings.triggerEvent,
                roleId: notificationSettings.roleId,
                roleName: roles.name,
                enabled: notificationSettings.enabled,
            })
            .from(notificationSettings)
            .innerJoin(roles, eq(notificationSettings.roleId, roles.id))
            .where(eq(notificationSettings.restaurantId, restaurantId));
    }

    async findEnabledByEvent(
        restaurantId: number,
        triggerEvent: string
    ) {
        return db
            .select({
                roleId: notificationSettings.roleId,
                roleName: roles.name,
            })
            .from(notificationSettings)
            .innerJoin(roles, eq(notificationSettings.roleId, roles.id))
            .where(
                and(
                    eq(notificationSettings.restaurantId, restaurantId),
                    eq(notificationSettings.triggerEvent, triggerEvent),
                    eq(notificationSettings.enabled, true)
                )
            );
    }

    async upsert(
        restaurantId: number,
        triggerEvent: string,
        roleId: number,
        enabled: boolean
    ) {
        const [existing] = await db
            .select()
            .from(notificationSettings)
            .where(
                and(
                    eq(notificationSettings.restaurantId, restaurantId),
                    eq(notificationSettings.triggerEvent, triggerEvent),
                    eq(notificationSettings.roleId, roleId)
                )
            );

        if (existing) {
            const [updated] = await db
                .update(notificationSettings)
                .set({ enabled, updatedAt: new Date() })
                .where(eq(notificationSettings.id, existing.id))
                .returning();
            return updated;
        }

        const [created] = await db
            .insert(notificationSettings)
            .values({ restaurantId, triggerEvent, roleId, enabled })
            .returning();
        return created;
    }

    async bulkUpsert(
        restaurantId: number,
        settings: Array<{
            triggerEvent: string;
            roleId: number;
            enabled: boolean;
        }>
    ) {
        const results = [];
        for (const setting of settings) {
            const result = await this.upsert(
                restaurantId,
                setting.triggerEvent,
                setting.roleId,
                setting.enabled
            );
            results.push(result);
        }
        return results;
    }

    async seedDefaults(restaurantId: number) {
        // Get all roles for this restaurant
        const restaurantRoles = await db
            .select()
            .from(roles)
            .where(eq(roles.restaurantId, restaurantId));

        const findRole = (name: string) =>
            restaurantRoles.find(
                (r) => r.name.toLowerCase() === name.toLowerCase()
            );

        const kitchen = findRole("kitchen");
        const waiter = findRole("waiter");
        const owner = findRole("owner");
        const manager = findRole("manager");
        const cashier = findRole("cashier");

        const defaults: Array<{
            triggerEvent: NotificationTriggerEvent;
            roleId: number;
            enabled: boolean;
        }> = [];

        // Order placed: notify kitchen, waiter, owner, manager
        const orderPlacedRoles = [kitchen, waiter, owner, manager].filter(Boolean);
        for (const role of orderPlacedRoles) {
            defaults.push({
                triggerEvent: "order_placed",
                roleId: role!.id,
                enabled: true,
            });
        }

        // Preparing to ready: notify waiter, owner
        const readyRoles = [waiter, owner].filter(Boolean);
        for (const role of readyRoles) {
            defaults.push({
                triggerEvent: "status_preparing_to_ready",
                roleId: role!.id,
                enabled: true,
            });
        }

        // Ready to served: notify cashier
        if (cashier) {
            defaults.push({
                triggerEvent: "status_ready_to_served",
                roleId: cashier.id,
                enabled: true,
            });
        }

        // Order cancelled: notify kitchen, owner, manager
        const cancelledRoles = [kitchen, owner, manager].filter(Boolean);
        for (const role of cancelledRoles) {
            defaults.push({
                triggerEvent: "order_cancelled",
                roleId: role!.id,
                enabled: true,
            });
        }

        return this.bulkUpsert(restaurantId, defaults);
    }
}

export const notificationSettingsRepository =
    new NotificationSettingsRepository();
