import { db } from '../db';
import { user } from '../db/schemas/auth.schema';
import { eq, like, desc, asc, count } from 'drizzle-orm';
import type { PaginationParams } from '../types';

export class UserRepository {
    async findAll(pagination?: PaginationParams) {
        if (pagination) {
            const { page, limit } = pagination;
            const offset = (page - 1) * limit;

            const [data, totalResult] = await Promise.all([
                db.select().from(user).limit(limit).offset(offset).orderBy(desc(user.createdAt)),
                db.select({ count: count() }).from(user),
            ]);

            return {
                data,
                total: totalResult[0]?.count || 0,
            };
        }

        return {
            data: await db.select().from(user).orderBy(desc(user.createdAt)),
            total: 0,
        };
    }

    async findById(id: string) {
        const result = await db.select().from(user).where(eq(user.id, id)).limit(1);
        return result[0] || null;
    }

    async findByEmail(email: string) {
        const result = await db.select().from(user).where(eq(user.email, email)).limit(1);
        return result[0] || null;
    }

    async create(data: typeof user.$inferInsert) {
        const result = await db.insert(user).values(data).returning();
        return result[0];
    }

    async update(id: string, data: Partial<typeof user.$inferInsert>) {
        const result = await db
            .update(user)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(user.id, id))
            .returning();
        return result[0] || null;
    }

    async delete(id: string) {
        const result = await db.delete(user).where(eq(user.id, id)).returning();
        return result[0] || null;
    }

    async search(query: string, pagination?: PaginationParams) {
        const searchPattern = `%${query}%`;

        if (pagination) {
            const { page, limit } = pagination;
            const offset = (page - 1) * limit;

            const [data, totalResult] = await Promise.all([
                db
                    .select()
                    .from(user)
                    .where(like(user.name, searchPattern))
                    .limit(limit)
                    .offset(offset),
                db
                    .select({ count: count() })
                    .from(user)
                    .where(like(user.name, searchPattern)),
            ]);

            return {
                data,
                total: totalResult[0]?.count || 0,
            };
        }

        return {
            data: await db.select().from(user).where(like(user.name, searchPattern)),
            total: 0,
        };
    }
}

export const userRepository = new UserRepository();
