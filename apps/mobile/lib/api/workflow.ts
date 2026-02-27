import BaseAPI from './base';
import type { WorkflowTransition, WorkflowTransitionInput } from '@menugo/dto';

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
}

export const workflowAPI = new WorkflowAPI();
