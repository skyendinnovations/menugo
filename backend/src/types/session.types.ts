export interface CreateSessionDTO {
  tableId: number;
  hostDeviceId: string;
  personsCount?: number;
}

export interface JoinSessionDTO {
  joinCode: string;
  deviceId: string;
  participantName?: string;
}
