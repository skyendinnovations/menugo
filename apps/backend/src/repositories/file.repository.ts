import { eq, and } from "drizzle-orm";
import { db } from "@menugo/data";
import { files } from "@menugo/data/schemas";

class FileRepository {
  async create(data: typeof files.$inferInsert) {
    const [file] = await db.insert(files).values(data).returning();
    return file;
  }

  async findById(id: number) {
    const [file] = await db.select().from(files).where(eq(files.id, id));
    return file;
  }

  async findByEntity(entityType: string, entityId: string) {
    return db
      .select()
      .from(files)
      .where(
        and(
          eq(files.entityType, entityType as any),
          eq(files.entityId, entityId),
        ),
      );
  }

  async findByEntityAndPurpose(
    entityType: string,
    entityId: string,
    purpose: string,
  ) {
    const [file] = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.entityType, entityType as any),
          eq(files.entityId, entityId),
          eq(files.purpose, purpose),
        ),
      );
    return file;
  }

  async deleteById(id: number) {
    const [file] = await db.delete(files).where(eq(files.id, id)).returning();
    return file;
  }

  async deleteByEntity(entityType: string, entityId: string) {
    return db
      .delete(files)
      .where(
        and(
          eq(files.entityType, entityType as any),
          eq(files.entityId, entityId),
        ),
      )
      .returning();
  }
}

export const fileRepository = new FileRepository();
