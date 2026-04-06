<template>
  <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
    <div class="flex items-center gap-3">
      <div
        :class="[
          'w-3 h-3 rounded-full',
          status === 'healthy' ? 'bg-success-500 animate-pulse' : 'bg-danger-500',
        ]"
      ></div>
      <span class="font-medium text-gray-900 dark:text-white">{{ name }}</span>
    </div>
    <div class="flex items-center gap-4">
      <span class="text-sm text-gray-500 dark:text-gray-400">
        Latency: {{ latency }}
      </span>
      <span
        :class="[
          'px-2 py-1 rounded text-xs font-medium',
          status === 'healthy'
            ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
            : 'bg-danger-100 text-danger-700 dark:bg-danger-900/30 dark:text-danger-400',
        ]"
      >
        {{ status === 'healthy' ? 'Healthy' : 'Unhealthy' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string
  status: 'healthy' | 'unhealthy'
  latency: string
}>()
</script>
