import apiClient from './axios'

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: {
    id: string
    email: string
    role: string
    isActive: boolean
    createdAt: string
    lastLoginAt: string | null
  }
}

export interface ProfileResponse {
  id: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

export const authApi = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', { email, password })
    return response.data
  },

  async getProfile(): Promise<ProfileResponse> {
    const response = await apiClient.get<ProfileResponse>('/auth/me')
    return response.data
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout', {})
  },
}
