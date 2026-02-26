// ─── Staff Availability Types ───────────────────────────────────────

export type StaffAvailabilityStatus = "clocked_in" | "clocked_out";

export interface StaffAvailabilityEntry {
  id: number;
  userId: string;
  userName?: string;
  restaurantId: number;
  status: StaffAvailabilityStatus;
  activeOrderCount: number;
  clockedInAt?: string | null;
  clockedOutAt?: string | null;
}

export interface StaffAvailabilityList {
  available: StaffAvailabilityEntry[];
  unavailable: StaffAvailabilityEntry[];
  total: number;
}
