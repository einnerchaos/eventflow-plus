import apiClient from './axios'

export interface DashboardStats {
  events: {
    total: number
    last24Hours: number
  }
  rules: {
    total: number
    active: number
  }
  executions: {
    total: number
    failed: number
  }
  deadLetter: {
    unresolved: number
  }
}

export interface SystemHealth {
  healthy: boolean
  services: {
    database: { healthy: boolean; latencyMs: number }
    redis: { healthy: boolean; latencyMs: number }
  }
  timestamp: string
}

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/admin/dashboard')
    return response.data
  },

  async getHealth(): Promise<SystemHealth> {
    const response = await apiClient.get<SystemHealth>('/admin/system-health')
    return response.data
  },
}
