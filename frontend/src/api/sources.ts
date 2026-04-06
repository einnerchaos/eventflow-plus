import apiClient from './axios'

export interface EventSource {
  id: string
  name: string
  description?: string
  metadata?: Record<string, any>
  apiKey?: string
  apiKeySalt?: string
  isActive: boolean
  eventCount: number
  createdAt: string
  createdBy: string
}

export interface CreateSourceRequest {
  name: string
  description?: string
  metadata?: Record<string, any>
}

export interface CreateSourceResponse {
  id: string
  name: string
  apiKey: string
  message: string
}

export interface SourcesListResponse {
  data: EventSource[]
  total: number
  page: number
  limit: number
}

export const sourcesApi = {
  async getSources(): Promise<SourcesListResponse> {
    const response = await apiClient.get<SourcesListResponse>('/sources')
    return response.data
  },

  async createSource(data: CreateSourceRequest): Promise<CreateSourceResponse> {
    const response = await apiClient.post<CreateSourceResponse>('/sources', data)
    return response.data
  },

  async toggleSource(id: string, isActive: boolean): Promise<void> {
    await apiClient.patch(`/sources/${id}`, { isActive })
  },
}
