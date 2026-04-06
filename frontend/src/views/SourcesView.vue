<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Event Sources</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Manage external systems that send events to EventFlow
        </p>
      </div>
      <button @click="showCreateModal = true" class="btn-primary">
        <PlusIcon class="w-4 h-4 mr-2" />
        Add Source
      </button>
    </div>

    <div v-if="!loading && sources.length > 0" class="glass-panel rounded-xl overflow-hidden">
      <table class="w-full">
        <thead class="bg-gray-50 dark:bg-gray-700/50">
          <tr>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Name</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">API Key</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Events Sent</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
            <th class="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr v-for="source in sources" :key="source.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/30">
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                  <ServerStackIcon class="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <p class="font-medium text-gray-900 dark:text-white">{{ source.name }}</p>
                  <p class="text-sm text-gray-500 dark:text-gray-400">{{ source.metadata?.sourceType || 'webhook' }}</p>
                </div>
              </div>
            </td>
            <td class="px-6 py-4">
              <code class="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                {{ source.apiKey ? source.apiKey.slice(0, 16) + '...' : '***hidden***' }}
              </code>
            </td>
            <td class="px-6 py-4">
              <span :class="source.isActive ? 'status-success' : 'status-danger'">
                {{ source.isActive ? 'Active' : 'Inactive' }}
              </span>
            </td>
            <td class="px-6 py-4 text-gray-600 dark:text-gray-300">
              {{ (source.eventCount || 0).toLocaleString() }}
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
              {{ formatRelativeTime(source.createdAt) }}
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center gap-2">
                <button @click="viewSource(source)" class="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <EyeIcon class="w-4 h-4" />
                </button>
                <button @click="toggleSource(source)" class="p-2 rounded-lg" :class="source.isActive ? 'text-danger-500 hover:bg-danger-50' : 'text-success-500 hover:bg-success-50'">
                  <PowerIcon class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="p-4 bg-danger-50 dark:bg-danger-900/30 rounded-lg">
      <p class="text-sm text-danger-700 dark:text-danger-400">{{ error }}</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
      <p class="text-gray-500 mt-4">Loading sources...</p>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && !error && sources.length === 0" class="glass-panel rounded-xl p-12 text-center">
      <ServerStackIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Event Sources Yet</h3>
      <p class="text-gray-500 dark:text-gray-400 mb-6">Create your first event source to start receiving events.</p>
      <button @click="showCreateModal = true" class="btn-primary inline-flex items-center">
        <PlusIcon class="w-5 h-5 mr-2" />
        Add Your First Source
      </button>
    </div>

    <div class="glass-panel rounded-xl p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">API Integration Guide</h3>
      <div class="bg-gray-900 rounded-lg p-4 overflow-auto">
        <code class="text-sm text-green-400 font-mono"># Send Event to EventFlow
POST /api/v1/events
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "eventType": "user.created",
  "correlationId": "unique-id-123",
  "payload": {
    "userId": "123",
    "email": "user@example.com"
  }
}</code>
      </div>
    </div>

    <!-- Create Source Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Create Event Source</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
            <input v-model="newSource.name" type="text" class="input-field" placeholder="e.g., Payment System" />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea v-model="newSource.description" class="input-field" rows="3" placeholder="Describe what this source will send..."></textarea>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source Type</label>
            <select v-model="newSource.sourceType" class="input-field">
              <option value="webhook">Webhook</option>
              <option value="api">API Integration</option>
              <option value="sdk">SDK</option>
            </select>
          </div>
        </div>

        <div v-if="createdSource" class="mt-4 p-4 bg-success-50 dark:bg-success-900/30 rounded-lg">
          <p class="text-sm text-success-700 dark:text-success-400 font-medium">Source created successfully!</p>
          <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">API Key:</p>
          <code class="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded block mt-1 break-all">{{ createdSource.apiKey }}</code>
          <p class="text-xs text-danger-600 dark:text-danger-400 mt-2">Save this API key - it won't be shown again!</p>
        </div>

        <div class="flex justify-end gap-3 mt-6">
          <button @click="closeModal" class="btn-secondary">Close</button>
          <button v-if="!createdSource" @click="createSource" :disabled="creating || !newSource.name" class="btn-primary">
            <span v-if="creating">Creating...</span>
            <span v-else>Create Source</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { PlusIcon, ServerStackIcon, EyeIcon, PowerIcon } from '@heroicons/vue/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { sourcesApi, type EventSource, type CreateSourceResponse } from '../api/sources'

const sources = ref<EventSource[]>([])
const showCreateModal = ref(false)
const creating = ref(false)
const createdSource = ref<CreateSourceResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const newSource = reactive({
  name: '',
  description: '',
  sourceType: 'webhook',
})

async function loadSources() {
  loading.value = true
  error.value = null
  try {
    const response = await sourcesApi.getSources()
    sources.value = response.data || []
    console.log('Loaded sources:', sources.value.length)
  } catch (err: any) {
    console.error('Failed to load sources:', err)
    error.value = err.response?.data?.message || err.message || 'Failed to load sources'
    sources.value = []
  } finally {
    loading.value = false
    console.log('Loading complete. Sources:', sources.value.length, 'Loading:', loading.value, 'Error:', error.value)
  }
}

async function createSource() {
  creating.value = true
  try {
    const response = await sourcesApi.createSource({
      name: newSource.name,
      description: newSource.description,
      metadata: {
        sourceType: newSource.sourceType,
      },
    })
    createdSource.value = response
    await loadSources()
    
    // Auto-close modal after 5 seconds
    setTimeout(() => {
      closeModal()
    }, 5000)
  } catch (err: any) {
    alert(err.response?.data?.message || 'Failed to create source')
  } finally {
    creating.value = false
  }
}

function closeModal() {
  showCreateModal.value = false
  createdSource.value = null
  newSource.name = ''
  newSource.description = ''
  newSource.sourceType = 'webhook'
}

function formatRelativeTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

function viewSource(source: EventSource) {
  alert(`Source: ${source.name}\nAPI Key: ${source.apiKey}\nStatus: ${source.isActive ? 'Active' : 'Inactive'}`)
}

async function toggleSource(source: EventSource) {
  try {
    await sourcesApi.toggleSource(source.id, !source.isActive)
    source.isActive = !source.isActive
  } catch (err: any) {
    alert(err.response?.data?.message || 'Failed to toggle source')
  }
}

onMounted(() => {
  loadSources()
})
</script>
