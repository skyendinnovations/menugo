import BaseAPI from './base';
import type { WorkflowTransition, WorkflowTransitionInput } from '@menugo/dto';

export interface OrderFlow {
  statuses: string[];
  transitions: Record<string, string | null>;
}

export interface FlowStepDetail {
  roleId: number;
  roleName: string;
  showAcceptButton: boolean;
  entryStatus: string;
  exitStatus: string;
  entryStatusLabel: string;
  exitStatusLabel: string;
  triggerEvent: string;
}

export interface FlowConfig {
  steps: FlowStepDetail[];
  availableRoles: Array<{ id: number; name: string }>;
}

export interface FlowStepInput {
  roleId: number;
  showAcceptButton: boolean;
}

class WorkflowAPI extends BaseAPI {
  async getWorkflows(restaurantId: number) {
    return this.get<{ success: boolean; data: WorkflowTransition[] }>(
      `/api/restaurants/${restaurantId}/workflows`
    );
  }

  async updateWorkflows(restaurantId: number, transitions: WorkflowTransitionInput[]) {
    return this.put<{ success: boolean; data: WorkflowTransition[] }>(
      `/api/restaurants/${restaurantId}/workflows`,
      { transitions }
    );
  }

  async getFlow(restaurantId: number) {
    return this.get<{ success: boolean; data: OrderFlow }>(
      `/api/restaurants/${restaurantId}/workflows/flow`
    );
  }

  async getOrderFlow(restaurantId: number) {
    return this.get<{ success: boolean; data: OrderFlow }>(
      `/api/restaurants/${restaurantId}/workflows/order-flow`
    );
  }

  async getFlowConfig(restaurantId: number) {
    return this.get<{ success: boolean; data: FlowConfig }>(
      `/api/restaurants/${restaurantId}/workflows/flow-config`
    );
  }

  async saveFlowConfig(restaurantId: number, steps: FlowStepInput[]) {
    return this.put<{ success: boolean; data: FlowConfig }>(
      `/api/restaurants/${restaurantId}/workflows/flow-config`,
      { steps }
    );
  }
}

export const workflowAPI = new WorkflowAPI();
