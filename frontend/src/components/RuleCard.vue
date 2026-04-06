<template>
  <div class="glass-panel rounded-xl p-6 card-hover" :class="{ 'opacity-75': !rule.isActive }">
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <div
          :class="[
            'w-10 h-10 rounded-lg flex items-center justify-center',
            rule.isActive
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
          ]"
        >
          <Cog6ToothIcon class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-semibold text-gray-900 dark:text-white">{{ rule.name }}</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ rule.eventType }}</p>
        </div>
      </div>
      <span
        :class="[
          'px-2 py-1 rounded-full text-xs font-medium',
          rule.isActive
            ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400',
        ]"
      >
        {{ rule.isActive ? 'Active' : 'Inactive' }}
      </span>
    </div>

    <p class="text-sm text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
      {{ rule.description || 'No description' }}
    </p>

    <div class="space-y-2 mb-4">
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500 dark:text-gray-400">Executions:</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ rule.executionCount }}</span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500 dark:text-gray-400">Success Rate:</span>
        <span
          :class="[
            'font-medium',
            getSuccessRateColor(rule),
          ]"
        >
          {{ getSuccessRate(rule) }}%
        </span>
      </div>
      <div class="flex items-center justify-between text-sm">
        <span class="text-gray-500 dark:text-gray-400">Actions:</span>
        <span class="font-medium text-gray-900 dark:text-white">{{ rule.actions.length }}</span>
      </div>
    </div>

    <div class="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
      <button
        @click="$emit('toggle', rule)"
        class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
        :class="[
          rule.isActive
            ? 'bg-danger-50 text-danger-600 hover:bg-danger-100 dark:bg-danger-900/30 dark:text-danger-400'
            : 'bg-success-50 text-success-600 hover:bg-success-100 dark:bg-success-900/30 dark:text-success-400',
        ]"
      >
        {{ rule.isActive ? 'Deactivate' : 'Activate' }}
      </button>
      <button
        @click="$emit('edit', rule)"
        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <PencilIcon class="w-4 h-4" />
      </button>
      <button
        @click="$emit('delete', rule)"
        class="p-2 rounded-lg text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-900/30"
      >
        <TrashIcon class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Cog6ToothIcon, PencilIcon, TrashIcon } from '@heroicons/vue/24/outline'
import type { Rule } from '../api/rules'

defineProps<{
  rule: Rule
}>()

defineEmits<{
  toggle: [rule: Rule]
  edit: [rule: Rule]
  delete: [rule: Rule]
}>()

function getSuccessRate(rule: Rule) {
  if (rule.executionCount === 0) return 0
  return Math.round((rule.successCount / rule.executionCount) * 100)
}

function getSuccessRateColor(rule: Rule) {
  const rate = getSuccessRate(rule)
  if (rate >= 90) return 'text-success-600 dark:text-success-400'
  if (rate >= 70) return 'text-warning-600 dark:text-warning-400'
  return 'text-danger-600 dark:text-danger-400'
}
</script>
