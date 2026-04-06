<template>
  <span
    :class="[
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      statusClasses[status] || statusClasses.DEFAULT,
    ]"
  >
    <span
      :class="[
        'w-1.5 h-1.5 rounded-full mr-1.5',
        dotClasses[status] || dotClasses.DEFAULT,
      ]"
    ></span>
    {{ statusLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const statusClasses: Record<string, string> = {
  PENDING: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
  RECEIVED: 'bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400',
  MATCHED: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-400',
  PROCESSING: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
  SUCCESS: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400',
  FAILED: 'bg-danger-100 text-danger-800 dark:bg-danger-900/30 dark:text-danger-400',
  RETRYING: 'bg-warning-100 text-warning-800 dark:bg-warning-900/30 dark:text-warning-400',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  COMPLETED: 'bg-success-100 text-success-800 dark:bg-success-900/30 dark:text-success-400',
  DUPLICATE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
  DEFAULT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
}

const dotClasses: Record<string, string> = {
  PENDING: 'bg-warning-500',
  RECEIVED: 'bg-primary-500',
  MATCHED: 'bg-secondary-500',
  PROCESSING: 'bg-warning-500',
  SUCCESS: 'bg-success-500',
  FAILED: 'bg-danger-500',
  RETRYING: 'bg-warning-500',
  CANCELLED: 'bg-gray-500',
  COMPLETED: 'bg-success-500',
  DUPLICATE: 'bg-gray-500',
  DEFAULT: 'bg-gray-500',
}

const statusLabel = computed(() => {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    RECEIVED: 'Received',
    MATCHED: 'Matched',
    PROCESSING: 'Processing',
    SUCCESS: 'Success',
    FAILED: 'Failed',
    RETRYING: 'Retrying',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
    DUPLICATE: 'Duplicate',
  }
  return labels[props.status] || props.status
})
</script>
