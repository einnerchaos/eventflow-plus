import apiClient from './axios'

export interface Event {
  id: string
  sourceId: string
  eventType: string
  correlationId: string | null
  payload: Record<string, any>
  status: string
  receivedAt: string
  processedAt: string | null
  isDuplicate: boolean
  matchedRules: number
  source?: {
    name: string
  }
}

export interface EventsListResponse {
  data: Event[]
  total: number
  page: number
  limit: number
}

export interface EventStats {
  total: number
  byStatus: Record<string, number>
  bySource: Record<string, number>
  byType: Record<string, number>
  duplicates: number
  last24Hours: number
}

export const eventsApi = {
  async getEvents(params?: {
    page?: number
    limit?: number
    status?: string
    eventType?: string
  }): Promise<EventsListResponse> {
    const response = await apiClient.get<EventsListResponse>('/events', { params })
    return response.data
  },

  async getEvent(id: string): Promise<Event> {
    const response = await apiClient.get<Event>(`/events/${id}`)
    return response.data
  },

  async getStats(): Promise<EventStats> {
    const response = await apiClient.get<EventStats>('/events/stats/summary')
    return response.data
  },

  async reprocessEvent(id: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/events/${id}/reprocess`)
    return response.data
  },
}
