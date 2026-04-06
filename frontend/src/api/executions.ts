import apiClient from './axios'

export interface Execution {
  id: string
  eventId: string
  ruleId: string
  rule?: {
    name: string
  }
  actionType: string
  actionConfig: Record<string, any>
  status: string
  attemptCount: number
  maxAttempts: number
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  errorCategory: string | null
  durationMs: number | null
  createdAt: string
}

export interface ExecutionsListResponse {
  data: Execution[]
  total: number
  page: number
  limit: number
}

export interface ExecutionStats {
  total: number
  byStatus: Record<string, number>
  byActionType: Record<string, number>
  recentFailures: number
}

export const executionsApi = {
  async getExecutions(params?: {
    page?: number
    limit?: number
    status?: string
    actionType?: string
  }): Promise<ExecutionsListResponse> {
    const response = await apiClient.get<ExecutionsListResponse>('/executions', { params })
    return response.data
  },

  async getExecution(id: string): Promise<Execution> {
    const response = await apiClient.get<Execution>(`/executions/${id}`)
    return response.data
  },

  async retryExecution(id: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/executions/${id}/retry`)
    return response.data
  },

  async getStats(): Promise<ExecutionStats> {
    const response = await apiClient.get<ExecutionStats>('/executions/stats/summary')
    return response.data
  },
}
