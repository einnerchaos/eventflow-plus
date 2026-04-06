import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { dashboardApi } from '../api/dashboard'

interface DashboardStats {
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

interface SystemHealth {
  healthy: boolean
  services: {
    database: { healthy: boolean; latencyMs: number }
    redis: { healthy: boolean; latencyMs: number }
  }
  timestamp: string
}

export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref<DashboardStats | null>(null)
  const health = ref<SystemHealth | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const lastUpdated = ref<Date | null>(null)

  const recentEventsCount = computed(() => stats.value?.events.last24Hours || 0)
  const activeRulesCount = computed(() => stats.value?.rules.active || 0)
  const failedExecutionsCount = computed(() => stats.value?.executions.failed || 0)
  const systemStatus = computed(() => health.value?.healthy ? 'healthy' : 'unhealthy')

  async function fetchStats() {
    loading.value = true
    error.value = null
    
    try {
      const response = await dashboardApi.getStats()
      stats.value = response
      lastUpdated.value = new Date()
      return response
    } catch (err: any) {
      error.value = err.response?.data?.message || 'Failed to fetch stats'
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchHealth() {
    try {
      const response = await dashboardApi.getHealth()
      health.value = response
      return response
    } catch (err) {
      health.value = null
      return null
    }
  }

  async function refreshAll() {
    await Promise.all([
      fetchStats(),
      fetchHealth(),
    ])
  }

  return {
    stats,
    health,
    loading,
    error,
    lastUpdated,
    recentEventsCount,
    activeRulesCount,
    failedExecutionsCount,
    systemStatus,
    fetchStats,
    fetchHealth,
    refreshAll,
  }
})
