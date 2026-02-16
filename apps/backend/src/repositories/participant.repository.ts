import { eq, and, inArray } from "drizzle-orm";
import { db } from "@menugo/data";
import { sessionParticipants } from "@menugo/data/schemas";

class ParticipantRepository {
  async findBySession(sessionId: number) {
    return db
      .select()
      .from(sessionParticipants)
      .where(eq(sessionParticipants.sessionId, sessionId));
  }

  async findByDeviceAndSession(deviceId: string, sessionId: number) {
    const [p] = await db
      .select()
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.deviceId, deviceId),
          eq(sessionParticipants.sessionId, sessionId),
        ),
      );
    return p || null;
  }

  /** Batch lookup: find active participant row for a device across multiple sessions (avoids N+1) */
  async findActiveByDeviceInSessions(deviceId: string, sessionIds: number[]) {
    if (sessionIds.length === 0) return [];
    return db
      .select()
      .from(sessionParticipants)
      .where(
        and(
          eq(sessionParticipants.deviceId, deviceId),
          inArray(sessionParticipants.sessionId, sessionIds),
          eq(sessionParticipants.status, "active"),
        ),
      );
  }

  async add(sessionId: number, deviceId: string, participantName?: string) {
    const [p] = await db
      .insert(sessionParticipants)
      .values({ sessionId, deviceId, participantName })
      .returning();
    return p;
  }

  async remove(id: number) {
    const [p] = await db
      .update(sessionParticipants)
      .set({ status: "left" })
      .where(eq(sessionParticipants.id, id))
      .returning();
    return p;
  }
}

export const participantRepository = new ParticipantRepository();
