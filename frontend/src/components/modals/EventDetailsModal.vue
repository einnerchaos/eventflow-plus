<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div @click="$emit('close')" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
      <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
        <div>
          <h3 class="text-xl font-bold text-gray-900 dark:text-white">Event Details</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ event.eventType }}</p>
        </div>
        <button @click="$emit('close')" class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700">
          <XMarkIcon class="w-5 h-5" />
        </button>
      </div>

      <div class="p-6 space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase">ID</p>
            <p class="text-sm font-mono text-gray-900 dark:text-white mt-1">{{ event.id }}</p>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase">Status</p>
            <div class="mt-1">
              <StatusBadge :status="event.status" />
            </div>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase">Source</p>
            <p class="text-sm text-gray-900 dark:text-white mt-1">{{ event.source?.name || 'Unknown' }}</p>
          </div>
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase">Duplicate</p>
            <p class="text-sm text-gray-900 dark:text-white mt-1">{{ event.isDuplicate ? 'Yes' : 'No' }}</p>
          </div>
        </div>

        <div>
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payload</h4>
          <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto text-sm">{{ JSON.stringify(event.payload, null, 2) }}</pre>
        </div>

        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-gray-500 dark:text-gray-400">Received</p>
            <p class="text-gray-900 dark:text-white">{{ formatDate(event.receivedAt) }}</p>
          </div>
          <div>
            <p class="text-gray-500 dark:text-gray-400">Processed</p>
            <p class="text-gray-900 dark:text-white">{{ event.processedAt ? formatDate(event.processedAt) : 'Not processed' }}</p>
          </div>
        </div>

        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">Correlation ID</p>
          <p class="text-sm font-mono text-gray-900 dark:text-white">{{ event.correlationId || 'None' }}</p>
        </div>

        <div>
          <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Matched Rules</h4>
          <p class="text-sm text-gray-600 dark:text-gray-300">{{ event.matchedRules }} rules matched this event</p>
        </div>
      </div>

      <div class="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 p-6 border-t border-gray-200 dark:border-gray-700">
        <div class="flex justify-end gap-3">
          <button @click="$emit('close')" class="btn-secondary">Close</button>
          <button v-if="event.status === 'FAILED'" @click="reprocess" class="btn-primary">
            <ArrowPathIcon class="w-4 h-4 mr-2" />
            Reprocess
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { XMarkIcon, ArrowPathIcon } from '@heroicons/vue/24/outline'
import StatusBadge from '../StatusBadge.vue'
import type { Event } from '../../api/events'
import { eventsApi } from '../../api/events'
import { format } from 'date-fns'

const props = defineProps<{
  event: Event
}>()

defineEmits<{
  close: []
}>()

function formatDate(date: string) {
  return format(new Date(date), 'PPpp')
}

async function reprocess() {
  try {
    await eventsApi.reprocessEvent(props.event.id)
    alert('Event reprocessing initiated')
  } catch (err) {
    console.error('Failed to reprocess:', err)
  }
}
</script>
