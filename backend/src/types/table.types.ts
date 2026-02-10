export interface CreateTableDTO {
  tableNumber: number;
  capacity?: number;
}

export interface BulkCreateTablesDTO {
  from: number;
  to: number;
  capacity?: number;
}

export interface UpdateTableDTO {
  capacity?: number;
  isActive?: boolean;
}
