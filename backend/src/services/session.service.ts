import { sessionRepository } from "../repositories/session.repository";
import { participantRepository } from "../repositories/participant.repository";
import { orderRepository } from "../repositories/order.repository";
import { tableRepository } from "../repositories/table.repository";
import { AppError } from "../types";
import type { CreateSessionDTO, JoinSessionDTO, TableInfoDTO } from "../types/session.types";

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

  async getTableInfo(table: { id: number; capacity: number; tableNumber: number }, deviceId?: string): Promise<TableInfoDTO> {
    const activeSessions = await sessionRepository.findAllActiveByTable(table.id);
    const occupiedSeats = activeSessions.reduce(
      (sum, s) => sum + (s.personsCount || 1),
      0
    );
    const availableSeats = Math.max(0, table.capacity - occupiedSeats);

    // Check if the device already has an active session on this table (as host OR participant)
    let existingSessionId: number | undefined;
    if (deviceId) {
      // Check as host
      const hostSession = activeSessions.find((s) => s.hostDeviceId === deviceId);
      if (hostSession) {
        existingSessionId = hostSession.id;
      } else {
        // Batch check as participant (single query instead of N+1)
        const participantRows = await participantRepository.findActiveByDeviceInSessions(
          deviceId,
          activeSessions.map((s) => s.id)
        );
        if (participantRows.length > 0) {
          existingSessionId = participantRows[0]!.sessionId;
        }
      }
    }

    return {
      tableId: table.id,
      tableNumber: table.tableNumber,
      capacity: table.capacity,
      occupiedSeats,
      availableSeats,
      isFull: availableSeats === 0,
      activeSessionCount: activeSessions.length,
      existingSessionId,
    };
  }

  async createSession(restaurantId: number, dto: CreateSessionDTO) {
    // Check table exists
    const table = await tableRepository.findById(dto.tableId);
    if (!table) throw new AppError(404, "Table not found");
    if (table.restaurantId !== restaurantId) {
      throw new AppError(400, "Table does not belong to this restaurant");
    }

    // Check for existing active session for this device on this table (as host)
    const activeSessions = await sessionRepository.findAllActiveByTable(dto.tableId);
    const existingDeviceSession = activeSessions.find(
      (s) => s.hostDeviceId === dto.hostDeviceId
    );
    if (existingDeviceSession) {
      // Return existing session for this device
      const participants = await participantRepository.findBySession(
        existingDeviceSession.id
      );
      return { ...existingDeviceSession, participants, existed: true };
    }

    // Check if device is a participant in any active session on this table
    const participantRows = await participantRepository.findActiveByDeviceInSessions(
      dto.hostDeviceId,
      activeSessions.map((s) => s.id)
    );
    if (participantRows.length > 0) {
      const matchedSession = activeSessions.find((s) => s.id === participantRows[0]!.sessionId)!;
      const participants = await participantRepository.findBySession(matchedSession.id);
      return { ...matchedSession, participants, existed: true };
    }

    // Validate input early (before capacity check)
    if (!dto.customerName || !dto.customerName.trim()) {
      throw new AppError(400, "Customer name is required");
    }

    // Check seat capacity
    const occupiedSeats = activeSessions.reduce(
      (sum, s) => sum + (s.personsCount || 1),
      0
    );
    const requestedSeats = dto.personsCount ?? 1;
    const availableSeats = table.capacity - occupiedSeats;

    if (availableSeats <= 0) {
      throw new AppError(400, "SEATS_NOT_AVAILABLE: Table is full. No seats available.");
    }

    if (requestedSeats > availableSeats) {
      throw new AppError(
        400,
        `SEATS_NOT_AVAILABLE: Only ${availableSeats} seat(s) available, but ${requestedSeats} requested.`
      );
    }

    const newSession = await sessionRepository.create({
      restaurantId,
      tableId: dto.tableId,
      hostDeviceId: dto.hostDeviceId,
      personsCount: requestedSeats,
      customerName: dto.customerName.trim(),
    });

    if (!newSession) throw new AppError(500, "Failed to create session");

    // Add host as first participant with customer name
    await participantRepository.add(newSession.id, dto.hostDeviceId, dto.customerName.trim());

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
