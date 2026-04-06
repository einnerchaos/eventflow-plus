<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Events</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Monitor incoming events and their processing status
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="refreshEvents" :disabled="loading" class="btn-secondary">
          <ArrowPathIcon :class="{ 'animate-spin': loading }" class="w-4 h-4" />
          Refresh
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div class="lg:col-span-1 space-y-4">
        <div class="glass-panel rounded-xl p-4">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-4">Filters</h3>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select v-model="filters.status" @change="handleFilter" class="input-field">
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="RECEIVED">Received</option>
                <option value="MATCHED">Matched</option>
                <option value="PROCESSING">Processing</option>
                <option value="FAILED">Failed</option>
                <option value="COMPLETED">Completed</option>
                <option value="DUPLICATE">Duplicate</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Event Type
              </label>
              <input
                v-model="filters.eventType"
                @input="handleFilter"
                type="text"
                class="input-field"
                placeholder="e.g., user.created"
              />
            </div>
          </div>
        </div>

        <div class="glass-panel rounded-xl p-4">
          <h3 class="font-semibold text-gray-900 dark:text-white mb-4">Statistics</h3>
          <div class="space-y-3">
            <div v-for="(count, status) in stats?.byStatus" :key="status" class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :class="getStatusColor(status)"></span>
                <span class="text-sm text-gray-600 dark:text-gray-400">{{ status }}</span>
              </div>
              <span class="font-medium text-gray-900 dark:text-white">{{ count }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="lg:col-span-4">
        <div class="glass-panel rounded-xl overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Event
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Source
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Rules
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
                <tr v-for="event in events" :key="event.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td class="px-6 py-4">
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">{{ event.eventType }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400 font-mono">{{ event.id.slice(0, 8) }}...</p>
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <p class="text-sm text-gray-600 dark:text-gray-300">{{ event.source?.name || 'Unknown' }}</p>
                  </td>
                  <td class="px-6 py-4">
                    <StatusBadge :status="event.status" />
                    <span v-if="event.isDuplicate" class="ml-2 text-xs text-gray-500">(dup)</span>
                  </td>
                  <td class="px-6 py-4">
                    <span class="text-sm text-gray-600 dark:text-gray-300">
                      {{ event.matchedRules }} matched
                    </span>
                  </td>
                  <td class="px-6 py-4">
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatRelativeTime(event.receivedAt) }}
                    </p>
                  </td>
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                      <button
                        @click="viewEventDetails(event)"
                        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="View Details"
                      >
                        <EyeIcon class="w-4 h-4" />
                      </button>
                      <button
                        v-if="event.status === 'FAILED'"
                        @click="reprocessEvent(event.id)"
                        class="p-2 rounded-lg text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/30"
                        title="Reprocess"
                      >
                        <ArrowPathIcon class="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Showing {{ events.length }} of {{ total }} events
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
                :disabled="events.length < limit"
                class="btn-secondary py-1 px-3 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <EventDetailsModal
      v-if="selectedEvent"
      :event="selectedEvent"
      @close="selectedEvent = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import {
  ArrowPathIcon,
  EyeIcon,
} from '@heroicons/vue/24/outline'
import { eventsApi, type Event } from '../api/events'
import StatusBadge from '../components/StatusBadge.vue'
import EventDetailsModal from '../components/modals/EventDetailsModal.vue'
import { formatDistanceToNow } from 'date-fns'

const events = ref<Event[]>([])
const stats = ref<any>(null)
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const limit = ref(10)
const selectedEvent = ref<Event | null>(null)
const filters = ref({
  status: '',
  eventType: '',
})

let refreshInterval: ReturnType<typeof setInterval>

const statusColors: Record<string, string> = {
  PENDING: 'bg-warning-500',
  RECEIVED: 'bg-primary-500',
  MATCHED: 'bg-secondary-500',
  PROCESSING: 'bg-warning-500',
  SUCCESS: 'bg-success-500',
  FAILED: 'bg-danger-500',
  COMPLETED: 'bg-success-500',
  DUPLICATE: 'bg-gray-500',
}

function getStatusColor(status: string) {
  return statusColors[status] || 'bg-gray-500'
}

function formatRelativeTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

async function loadEvents() {
  loading.value = true
  try {
    const response = await eventsApi.getEvents({
      page: page.value,
      limit: limit.value,
      status: filters.value.status || undefined,
      eventType: filters.value.eventType || undefined,
    })
    events.value = response.data
    total.value = response.total
  } catch (err) {
    console.error('Failed to load events:', err)
  } finally {
    loading.value = false
  }
}

async function loadStats() {
  try {
    const response = await eventsApi.getStats()
    stats.value = response
  } catch (err) {
    console.error('Failed to load stats:', err)
  }
}

async function refreshEvents() {
  await Promise.all([loadEvents(), loadStats()])
}

function handleFilter() {
  page.value = 1
  loadEvents()
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    loadEvents()
  }
}

function nextPage() {
  page.value++
  loadEvents()
}

function viewEventDetails(event: Event) {
  selectedEvent.value = event
}

async function reprocessEvent(id: string) {
  try {
    await eventsApi.reprocessEvent(id)
    refreshEvents()
  } catch (err) {
    console.error('Failed to reprocess event:', err)
  }
}

onMounted(() => {
  refreshEvents()
  refreshInterval = setInterval(refreshEvents, 30000)
})

onUnmounted(() => {
  clearInterval(refreshInterval)
})
</script>
