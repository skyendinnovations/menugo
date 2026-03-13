import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import { notificationSettings, roles, restaurantWorkflows, userRoles, staffAvailability } from "@menugo/data/schemas";


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

        // Get the active workflow transitions so we only seed notifications
        // for trigger events that actually exist in the configured flow.
        const activeWorkflows = await db
            .select({
                fromState: restaurantWorkflows.fromState,
                toState: restaurantWorkflows.toState,
            })
            .from(restaurantWorkflows)
            .where(
                and(
                    eq(restaurantWorkflows.restaurantId, restaurantId),
                    eq(restaurantWorkflows.isActive, true),
                )
            );

        // Build a set of trigger events that match the active transitions
        const activeTriggers = new Set<string>();
        activeTriggers.add("order_placed"); // always present
        activeTriggers.add("order_cancelled"); // always present
        for (const w of activeWorkflows) {
            if (w.toState !== "cancelled") {
                activeTriggers.add(`status_${w.fromState}_to_${w.toState}`);
            }
        }

        const defaults: Array<{
            triggerEvent: string;
            roleId: number;
            enabled: boolean;
        }> = [];

        // Order placed: notify available roles
        const orderPlacedRoles = [kitchen, waiter, owner, manager].filter(Boolean);
        for (const role of orderPlacedRoles) {
            defaults.push({
                triggerEvent: "order_placed",
                roleId: role!.id,
                enabled: true,
            });
        }

        // Status transition notifications — only for transitions in the active flow
        for (const trigger of activeTriggers) {
            if (trigger === "order_placed" || trigger === "order_cancelled") continue;

            // Determine which roles should be notified for this transition
            const notifyRoles: Array<typeof owner> = [];

            if (trigger.includes("_to_ready")) {
                // Food is ready — notify waiter + owner
                notifyRoles.push(waiter, owner);
            } else if (trigger.includes("_to_served")) {
                // Served — notify cashier (if exists), owner
                notifyRoles.push(cashier, owner);
            } else if (trigger.includes("_to_paid")) {
                // Paid — notify owner, manager
                notifyRoles.push(owner, manager);
            } else if (trigger.includes("_to_preparing")) {
                // Started preparing — notify waiter, owner
                notifyRoles.push(waiter, owner);
            } else {
                // Any other transition — notify owner
                notifyRoles.push(owner);
            }

            for (const role of notifyRoles.filter(Boolean)) {
                defaults.push({
                    triggerEvent: trigger,
                    roleId: role!.id,
                    enabled: true,
                });
            }
        }

        // Order cancelled: notify relevant roles
        const cancelledRoles = [kitchen, waiter, owner, manager].filter(Boolean);
        for (const role of cancelledRoles) {
            defaults.push({
                triggerEvent: "order_cancelled",
                roleId: role!.id,
                enabled: true,
            });
        }

        return this.bulkUpsert(restaurantId, defaults);
    }

    /**
     * Single-query recipient lookup for notification dispatch.
     *
     * JOINs notification_settings → user_roles → staff_availability
     * and returns the distinct user IDs of all clocked-in staff members
     * whose role has push notifications enabled for the given trigger event.
     */
    async findRecipientsForEvent(
        restaurantId: number,
        triggerEvent: string,
    ): Promise<string[]> {
        const rows = await db
            .selectDistinct({ userId: userRoles.userId })
            .from(notificationSettings)
            .innerJoin(
                userRoles,
                and(
                    eq(userRoles.roleId, notificationSettings.roleId),
                    eq(userRoles.restaurantId, restaurantId),
                ),
            )
            .innerJoin(
                staffAvailability,
                and(
                    eq(staffAvailability.userId, userRoles.userId),
                    eq(staffAvailability.restaurantId, restaurantId),
                    eq(staffAvailability.status, "clocked_in"),
                ),
            )
            .where(
                and(
                    eq(notificationSettings.restaurantId, restaurantId),
                    eq(notificationSettings.triggerEvent, triggerEvent),
                    eq(notificationSettings.enabled, true),
                ),
            );

        return rows.map((r) => r.userId);
    }
}

export const notificationSettingsRepository =
    new NotificationSettingsRepository();
