import apiClient from './axios'

export interface Rule {
  id: string
  name: string
  description: string | null
  eventType: string
  sourceId: string | null
  priority: number
  conditions: any
  conditionText: string
  actions: any[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  executionCount: number
  successCount: number
  failureCount: number
  lastExecutedAt: string | null
}

export interface RulesListResponse {
  data: Rule[]
  total: number
  page: number
  limit: number
}

export interface CreateRuleRequest {
  name: string
  description?: string
  eventType: string
  sourceId?: string
  priority?: number
  conditions: any
  actions: any[]
  isActive?: boolean
}

export interface RuleStats {
  executionCount: number
  successCount: number
  failureCount: number
  successRate: number
  lastExecutedAt: string | null
  last7Days: Array<{ date: string; count: number }>
}

export const rulesApi = {
  async getRules(params?: {
    page?: number
    limit?: number
    isActive?: boolean
    search?: string
  }): Promise<RulesListResponse> {
    const response = await apiClient.get<RulesListResponse>('/rules', { params })
    return response.data
  },

  async getRule(id: string): Promise<Rule> {
    const response = await apiClient.get<Rule>(`/rules/${id}`)
    return response.data
  },

  async createRule(data: CreateRuleRequest): Promise<Rule> {
    const response = await apiClient.post<Rule>('/rules', data)
    return response.data
  },

  async updateRule(id: string, data: Partial<CreateRuleRequest>): Promise<Rule> {
    const response = await apiClient.patch<Rule>(`/rules/${id}`, data)
    return response.data
  },

  async deleteRule(id: string): Promise<void> {
    await apiClient.delete(`/rules/${id}`)
  },

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const endpoint = isActive ? `/rules/${id}/activate` : `/rules/${id}/deactivate`
    await apiClient.post(endpoint)
  },

  async getRuleStats(id: string): Promise<RuleStats> {
    const response = await apiClient.get<RuleStats>(`/rules/${id}/stats`)
    return response.data
  },

  async testRule(id: string, payload: Record<string, any>): Promise<any> {
    const response = await apiClient.post(`/rules/${id}/test`, { payload })
    return response.data
  },
}
