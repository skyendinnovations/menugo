import { sessionRepository } from "../repositories/session.repository";
import { participantRepository } from "../repositories/participant.repository";
import { orderRepository } from "../repositories/order.repository";
import { tableRepository } from "../repositories/table.repository";
import { AppError } from "../types";
import type { CreateSessionDTO, JoinSessionDTO } from "../types/session.types";

class SessionService {
  async getActiveSessions(restaurantId: number) {
    return sessionRepository.findActiveByRestaurant(restaurantId);
  }

  async getAllSessions(restaurantId: number) {
    return sessionRepository.findAllByRestaurant(restaurantId);
  }

  async getSessionById(id: number) {
    const session = await sessionRepository.findById(id);
    if (!session) throw new AppError(404, "Session not found");

    const participants = await participantRepository.findBySession(id);
    return { ...session, participants };
  }

  async createSession(restaurantId: number, dto: CreateSessionDTO) {
    // Check table exists
    const table = await tableRepository.findById(dto.tableId);
    if (!table) throw new AppError(404, "Table not found");
    if (table.restaurantId !== restaurantId) {
      throw new AppError(400, "Table does not belong to this restaurant");
    }

    // Check for existing active session on this table
    const existingSession = await sessionRepository.findActiveByTable(dto.tableId);
    if (existingSession) {
      // Return existing session instead of creating new
      const participants = await participantRepository.findBySession(
        existingSession.id
      );
      return { ...existingSession, participants, existed: true };
    }

    const newSession = await sessionRepository.create({
      restaurantId,
      tableId: dto.tableId,
      hostDeviceId: dto.hostDeviceId,
      personsCount: dto.personsCount ?? 1,
    });

    if (!newSession) throw new AppError(500, "Failed to create session");

    // Add host as first participant
    await participantRepository.add(newSession.id, dto.hostDeviceId);

    const participants = await participantRepository.findBySession(newSession.id);
    return { ...newSession, participants, existed: false };
  }

  async joinSession(dto: JoinSessionDTO) {
    const session = await sessionRepository.findByJoinCode(dto.joinCode);
    if (!session) throw new AppError(404, "Invalid join code");

    // Check if device already joined
    const existing = await participantRepository.findByDeviceAndSession(
      dto.deviceId,
      session.id
    );
    if (existing) {
      return { session, participant: existing, alreadyJoined: true };
    }

    const participant = await participantRepository.add(
      session.id,
      dto.deviceId,
      dto.participantName
    );

    return { session, participant, alreadyJoined: false };
  }

  async closeSession(id: number, endedBy: string) {
    const session = await sessionRepository.findById(id);
    if (!session) throw new AppError(404, "Session not found");
    if (session.status !== "active") {
      throw new AppError(400, "Session is not active");
    }

    const total = await orderRepository.calculateSessionTotal(id);
    return sessionRepository.close(id, endedBy, total);
  }
}

export const sessionService = new SessionService();
