export interface CreateSessionDTO {
  tableId: number;
  hostDeviceId: string;
  personsCount?: number;
  customerName?: string;
}

export interface TableInfoDTO {
  tableId: number;
  tableNumber: number;
  capacity: number;
  occupiedSeats: number;
  availableSeats: number;
  isFull: boolean;
  activeSessions: {
    id: number;
    customerName: string | null;
    personsCount: number;
    joinCode: string;
  }[];
  existingSessionId?: number;
}

export interface JoinSessionDTO {
  joinCode: string;
  deviceId: string;
  participantName?: string;
}
