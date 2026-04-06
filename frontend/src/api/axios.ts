import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

apiClient.interceptors.request.use(
  (config) => {
    const saved = localStorage.getItem('tokens')
    if (saved) {
      try {
        const tokens = JSON.parse(saved)
        if (tokens?.accessToken) {
          config.headers.Authorization = `Bearer ${tokens.accessToken}`
        }
      } catch {
        // Invalid JSON in localStorage
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
