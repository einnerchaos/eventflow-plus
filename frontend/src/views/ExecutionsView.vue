<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Executions</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Monitor action executions and retry failed tasks
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="refreshExecutions" :disabled="loading" class="btn-secondary">
          <ArrowPathIcon :class="{ 'animate-spin': loading }" class="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div
        v-for="stat in executionStats"
        :key="stat.label"
        class="glass-panel rounded-xl p-6"
      >
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ stat.label }}</p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-2">{{ stat.value }}</p>
        <div class="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            :class="stat.barColor"
            class="h-full rounded-full"
            :style="{ width: `${stat.percentage}%` }"
          ></div>
        </div>
      </div>
    </div>

    <div class="glass-panel rounded-xl overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Action
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Rule
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Attempts
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Duration
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
              <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="execution in executions" :key="execution.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div :class="getActionIconBg(execution.actionType)" class="p-2 rounded-lg">
                    <component :is="getActionIcon(execution.actionType)" class="w-4 h-4" :class="getActionIconColor(execution.actionType)" />
                  </div>
                  <div>
                    <p class="text-sm font-medium text-gray-900 dark:text-white">{{ execution.actionType }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <p class="text-sm text-gray-600 dark:text-gray-300">{{ execution.rule?.name || 'Unknown' }}</p>
              </td>
              <td class="px-6 py-4">
                <StatusBadge :status="execution.status" />
              </td>
              <td class="px-6 py-4">
                <span class="text-sm" :class="execution.attemptCount >= execution.maxAttempts ? 'text-danger-500' : 'text-gray-600 dark:text-gray-300'">
                  {{ execution.attemptCount }} / {{ execution.maxAttempts }}
                </span>
              </td>
              <td class="px-6 py-4">
                <p class="text-sm text-gray-600 dark:text-gray-300">
                  {{ execution.durationMs ? `${execution.durationMs}ms` : '-' }}
                </p>
              </td>
              <td class="px-6 py-4">
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  {{ formatRelativeTime(execution.createdAt) }}
                </p>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <button
                    v-if="execution.status === 'FAILED'"
                    @click="retryExecution(execution.id)"
                    class="btn-primary py-1 px-3 text-sm"
                  >
                    Retry
                  </button>
                  <button
                    @click="viewDetails(execution)"
                    class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <EyeIcon class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Showing {{ executions.length }} of {{ total }} executions
        </p>
        <div class="flex items-center gap-2">
          <button
            @click="prevPage"
            :disabled="page === 1"
            class="btn-secondary py-1 px-3 disabled:opacity-50"
          >
            Previous
          </button>
          <span class="text-sm text-gray-600 dark:text-gray-400">Page {{ page }}</span>
          <button
            @click="nextPage"
            :disabled="executions.length < limit"
            class="btn-secondary py-1 px-3 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  ArrowPathIcon,
  EyeIcon,
  GlobeAltIcon,
  EnvelopeIcon,
  BellAlertIcon,
} from '@heroicons/vue/24/outline'
import { executionsApi, type Execution } from '../api/executions'
import StatusBadge from '../components/StatusBadge.vue'
import { formatDistanceToNow } from 'date-fns'

const executions = ref<Execution[]>([])
const stats = ref<any>(null)
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const limit = ref(10)

const executionStats = computed(() => {
  if (!stats.value) return []
  
  const total = stats.value.total || 1
  const success = stats.value.byStatus?.SUCCESS || 0
  const failed = stats.value.byStatus?.FAILED || 0
  const pending = stats.value.byStatus?.PENDING || 0
  
  return [
    {
      label: 'Total',
      value: total,
      percentage: 100,
      barColor: 'bg-primary-500',
    },
    {
      label: 'Success',
      value: success,
      percentage: (success / total) * 100,
      barColor: 'bg-success-500',
    },
    {
      label: 'Failed',
      value: failed,
      percentage: (failed / total) * 100,
      barColor: 'bg-danger-500',
    },
    {
      label: 'Pending',
      value: pending,
      percentage: (pending / total) * 100,
      barColor: 'bg-warning-500',
    },
  ]
})

const iconMap: Record<string, any> = {
  webhook: GlobeAltIcon,
  email: EnvelopeIcon,
  notification: BellAlertIcon,
}

function getActionIcon(type: string) {
  return iconMap[type] || GlobeAltIcon
}

function getActionIconBg(type: string) {
  const map: Record<string, string> = {
    webhook: 'bg-primary-100 dark:bg-primary-900/30',
    email: 'bg-secondary-100 dark:bg-secondary-900/30',
    notification: 'bg-warning-100 dark:bg-warning-900/30',
  }
  return map[type] || 'bg-gray-100 dark:bg-gray-700'
}

function getActionIconColor(type: string) {
  const map: Record<string, string> = {
    webhook: 'text-primary-600 dark:text-primary-400',
    email: 'text-secondary-600 dark:text-secondary-400',
    notification: 'text-warning-600 dark:text-warning-400',
  }
  return map[type] || 'text-gray-600 dark:text-gray-400'
}

let refreshInterval: ReturnType<typeof setInterval>

function formatRelativeTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

async function loadExecutions() {
  loading.value = true
  try {
    const response = await executionsApi.getExecutions({
      page: page.value,
      limit: limit.value,
    })
    executions.value = response.data
    total.value = response.total
  } catch (err) {
    console.error('Failed to load executions:', err)
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const response = await executionsApi.getStats()
    stats.value = response
  } catch (err) {
    console.error('Failed to load stats:', err)
  }
}

async function refreshExecutions() {
  await Promise.all([loadExecutions(), loadStats()])
}

async function retryExecution(id: string) {
  try {
    await executionsApi.retryExecution(id)
    await loadExecutions()
  } catch (err) {
    console.error('Failed to retry execution:', err)
  }
}

function viewDetails(_execution: Execution) {}

function prevPage() {
  if (page.value > 1) {
    page.value--
    loadExecutions()
  }
}

function nextPage() {
  page.value++
  loadExecutions()
}

onMounted(() => {
  refreshExecutions()
  refreshInterval = setInterval(refreshExecutions, 30000)
})

onUnmounted(() => {
  clearInterval(refreshInterval)
})
</script>
