<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
          Dashboard Overview
        </h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Real-time insights into your event-driven platform
        </p>
      </div>
      <div class="flex items-center gap-3">
        <span v-if="lastUpdated" class="text-sm text-gray-500 dark:text-gray-400">
          Last updated: {{ formatTime(lastUpdated) }}
        </span>
        <button
          @click="refreshData"
          :disabled="loading"
          class="btn-secondary flex items-center gap-2"
        >
          <ArrowPathIcon
            :class="{ 'animate-spin': loading }"
            class="w-4 h-4"
          />
          Refresh
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        v-for="stat in mainStats"
        :key="stat.label"
        v-bind="stat"
      />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="glass-panel rounded-xl p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Events Over Time
          </h3>
          <select
            v-model="timeRange"
            class="input-field text-sm py-1 px-2 w-auto"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
        <div class="h-64">
          <LineChart
            v-if="eventsChartData"
            :data="eventsChartData"
            :options="chartOptions"
          />
        </div>
      </div>

      <div class="glass-panel rounded-xl p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Execution Status
          </h3>
          <RouterLink to="/executions" class="text-sm text-primary-500 hover:text-primary-600">
            View All
          </RouterLink>
        </div>
        <div class="h-64 flex items-center justify-center">
          <DoughnutChart
            v-if="executionsChartData"
            :data="executionsChartData"
            :options="doughnutOptions"
          />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="glass-panel rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          System Health
        </h3>
        <div class="space-y-4">
          <HealthIndicator
            v-for="service in healthServices"
            :key="service.name"
            v-bind="service"
          />
        </div>
      </div>

      <div class="glass-panel rounded-xl p-6 lg:col-span-2">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Events
          </h3>
          <RouterLink to="/events" class="text-sm text-primary-500 hover:text-primary-600">
            View All
          </RouterLink>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Time
                </th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Rules
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <tr v-for="event in recentEvents" :key="event.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                  {{ event.eventType }}
                </td>
                <td class="px-4 py-3">
                  <StatusBadge :status="event.status" />
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {{ formatRelativeTime(event.receivedAt) }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                  {{ event.matchedRules }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ArrowPathIcon } from '@heroicons/vue/24/outline'
import { useDashboardStore } from '../stores/dashboard'
import { eventsApi } from '../api/events'
import StatCard from '../components/StatCard.vue'
import HealthIndicator from '../components/HealthIndicator.vue'
import StatusBadge from '../components/StatusBadge.vue'
import LineChart from '../components/charts/LineChart.vue'
import DoughnutChart from '../components/charts/DoughnutChart.vue'
import { formatDistanceToNow, format } from 'date-fns'

const dashboardStore = useDashboardStore()
const { stats, health, loading, lastUpdated } = storeToRefs(dashboardStore)

const timeRange = ref('24h')
const recentEvents = ref<any[]>([])
const eventsChartData = ref<any>(null)
const executionsChartData = ref<any>(null)
let refreshInterval: ReturnType<typeof setInterval>

const mainStats = computed(() => [
  {
    label: 'Total Events',
    value: stats.value?.events.total || 0,
    change: `+${stats.value?.events.last24Hours || 0}`,
    changeType: 'positive',
    icon: 'BoltIcon',
    color: 'primary',
  },
  {
    label: 'Active Rules',
    value: stats.value?.rules.active || 0,
    change: `${stats.value?.rules.active || 0}/${stats.value?.rules.total || 0}`,
    changeType: 'neutral',
    icon: 'Cog6ToothIcon',
    color: 'secondary',
  },
  {
    label: 'Successful Executions',
    value: (stats.value?.executions.total || 0) - (stats.value?.executions.failed || 0),
    change: `${stats.value?.executions.total || 0} total`,
    changeType: 'positive',
    icon: 'CheckCircleIcon',
    color: 'success',
  },
  {
    label: 'Failed Executions',
    value: stats.value?.executions.failed || 0,
    change: `${stats.value?.deadLetter?.unresolved || 0} DLQ`,
    changeType: stats.value?.executions.failed ? 'negative' : 'neutral',
    icon: 'XCircleIcon',
    color: 'danger',
  },
])

const healthServices = computed(() => [
  {
    name: 'Database',
    status: health.value?.services.database.healthy ? 'healthy' : 'unhealthy',
    latency: `${health.value?.services.database.latencyMs || 0}ms`,
  },
  {
    name: 'Redis',
    status: health.value?.services.redis.healthy ? 'healthy' : 'unhealthy',
    latency: `${health.value?.services.redis.latencyMs || 0}ms`,
  },
  {
    name: 'Event Queue',
    status: health.value?.healthy ? 'healthy' : 'unhealthy',
    latency: 'Active',
  },
])

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(156, 163, 175, 0.1)',
      },
    },
    x: {
      grid: {
        display: false,
      },
    },
  },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
    },
  },
}

function formatTime(date: Date) {
  return format(date, 'HH:mm:ss')
}

function formatRelativeTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

async function refreshData() {
  await dashboardStore.refreshAll()
  await loadRecentEvents()
  generateChartData()
}

async function loadRecentEvents() {
  try {
    const response = await eventsApi.getEvents({ limit: 5 })
    recentEvents.value = response.data
  } catch (err) {
    console.error('Failed to load recent events:', err)
  }
}

function generateChartData() {
  eventsChartData.value = {
    labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'],
    datasets: [
      {
        label: 'Events',
        data: [12, 45, 89, 134, 167, 198, stats.value?.events.last24Hours || 0],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  }

  const total = stats.value?.executions.total || 1
  const failed = stats.value?.executions.failed || 0
  const success = total - failed

  executionsChartData.value = {
    labels: ['Success', 'Failed', 'Pending'],
    datasets: [
      {
        data: [success, failed, 0],
        backgroundColor: ['#22c55e', '#ef4444', '#f59e0b'],
        borderWidth: 0,
      },
    ],
  }
}

onMounted(() => {
  refreshData()
  refreshInterval = setInterval(refreshData, 30000)
})

onUnmounted(() => {
  clearInterval(refreshInterval)
})
</script>
