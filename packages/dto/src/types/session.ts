export interface Session {
    id: number;
    restaurantId: number;
    tableId: number;
    joinCode: string;
    hostDeviceId: string;
    personsCount: number;
    status: string;
    calculatedTotal?: string;
    startTime?: string;
    endTime?: string;
    participants?: any[];
    tableNumber?: number;
}

export interface SessionParticipant {
    id: number;
    sessionId: number;
    deviceId: string;
    participantName?: string;
    status: string;
    joinedAt?: string;
}

export interface CreateSessionDTO {
    tableId: number;
    hostDeviceId: string;
    personsCount?: number;
    customerName: string;
}

export interface JoinSessionDTO {
    joinCode: string;
    deviceId: string;
    participantName?: string;
}

export interface TableInfoDTO {
    tableId: number;
    tableNumber: number;
    capacity: number;
    occupiedSeats: number;
    availableSeats: number;
    isFull: boolean;
    activeSessionCount: number;
    existingSessionId?: number;
}
