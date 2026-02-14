export interface CreateSessionDTO {
  tableId: number;
  hostDeviceId: string;
  personsCount?: number;
  customerName: string;
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

export interface JoinSessionDTO {
  joinCode: string;
  deviceId: string;
  participantName?: string;
}
