import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authApi } from '../api/auth'

interface User {
  id: string
  email: string
  role: string
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const tokens = ref<AuthTokens | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!tokens.value?.accessToken)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    
    try {
      const response = await authApi.login(email, password)
      tokens.value = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresIn: response.expiresIn,
      }
      user.value = response.user
      
      localStorage.setItem('tokens', JSON.stringify(tokens.value))
      return true
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Login failed'
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchProfile() {
    try {
      const response = await authApi.getProfile()
      user.value = response
      return response
    } catch (err) {
      logout()
      return null
    }
  }

  function initAuth() {
    const saved = localStorage.getItem('tokens')
    if (saved) {
      try {
        tokens.value = JSON.parse(saved)
        fetchProfile()
      } catch {
        logout()
      }
    }
  }

  function logout() {
    user.value = null
    tokens.value = null
    localStorage.removeItem('tokens')
  }

  function getToken(): string | null {
    return tokens.value?.accessToken || null
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    isAdmin,
    login,
    logout,
    initAuth,
    fetchProfile,
    getToken,
  }
})
