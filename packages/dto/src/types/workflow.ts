// ─── Workflow Mode Types ────────────────────────────────────────────

export const WORKFLOW_MODES = [
  "full_service",
  "fast_service",
  "self_service",
] as const;

export type WorkflowMode = (typeof WORKFLOW_MODES)[number];

export const WORKFLOW_MODE_LABELS: Record<WorkflowMode, string> = {
  full_service: "Full Service (Kitchen → Filtered Waiter → Customer)",
  fast_service: "Fast Service (Broadcast to All Waiters)",
  self_service: "Self Service (Kitchen → Customer Pickup)",
};

export interface UpdateWorkflowModeDTO {
  workflowMode: WorkflowMode;
}

// ─── Workflow Transition Types ──────────────────────────────────────

export interface WorkflowTransition {
  id: number;
  restaurantId: number;
  fromState: string;
  toState: string;
  requiredPermission: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt?: string;
}

export interface WorkflowTransitionInput {
  fromState: string;
  toState: string;
  requiredPermission?: string | null;
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateWorkflowTransitionsDTO {
  transitions: WorkflowTransitionInput[];
}
