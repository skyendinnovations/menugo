import { db } from '../db';
import { users } from '../db/schemas/auth.schema';
import { eq, like, desc, asc, count } from 'drizzle-orm';
import type { PaginationParams } from '../types';

export class UserRepository {
    async findAll(pagination?: PaginationParams) {
        if (pagination) {
            const { page, limit } = pagination;
            const offset = (page - 1) * limit;

            const [data, totalResult] = await Promise.all([
                db.select().from(users).limit(limit).offset(offset).orderBy(desc(users.createdAt)),
                db.select({ count: count() }).from(users),
            ]);

            return {
                data,
                total: totalResult[0]?.count || 0,
            };
        }

        return {
            data: await db.select().from(users).orderBy(desc(users.createdAt)),
            total: 0,
        };
    }

    async findById(id: string) {
        const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return result[0] || null;
    }

    async findByEmail(email: string) {
        const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
        return result[0] || null;
    }

    async create(data: typeof users.$inferInsert) {
        const result = await db.insert(users).values(data).returning();
        return result[0];
    }

    async update(id: string, data: Partial<typeof users.$inferInsert>) {
        const result = await db
            .update(users)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(users.id, id))
            .returning();
        return result[0] || null;
    }

    async delete(id: string) {
        const result = await db.delete(users).where(eq(users.id, id)).returning();
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
                    .from(users)
                    .where(like(users.name, searchPattern))
                    .limit(limit)
                    .offset(offset),
                db
                    .select({ count: count() })
                    .from(users)
                    .where(like(users.name, searchPattern)),
            ]);

            return {
                data,
                total: totalResult[0]?.count || 0,
            };
        }

        return {
            data: await db.select().from(users).where(like(users.name, searchPattern)),
            total: 0,
        };
    }
}

export const userRepository = new UserRepository();
