<template>
  <div class="glass-panel rounded-xl p-6 card-hover">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
          {{ label }}
        </p>
        <p class="text-2xl font-bold text-gray-900 dark:text-white mt-2">
          {{ formattedValue }}
        </p>
        <div class="flex items-center gap-1 mt-2">
          <span
            :class="{
              'text-success-500': changeType === 'positive',
              'text-danger-500': changeType === 'negative',
              'text-gray-500': changeType === 'neutral',
            }"
            class="text-sm font-medium"
          >
            {{ change }}
          </span>
          <span class="text-xs text-gray-500 dark:text-gray-400">vs last period</span>
        </div>
      </div>
      <div
        :class="[
          'p-3 rounded-lg',
          iconBgClass,
        ]"
      >
        <component :is="iconComponent" class="w-6 h-6" :class="iconColorClass" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  BoltIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/vue/24/solid'

const props = defineProps<{
  label: string
  value: number
  change: string
  changeType: 'positive' | 'negative' | 'neutral'
  icon: string
  color: 'primary' | 'secondary' | 'success' | 'danger'
}>()

const iconMap: Record<string, any> = {
  BoltIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
}

const iconComponent = computed(() => iconMap[props.icon] || BoltIcon)

const formattedValue = computed(() => {
  if (props.value >= 1000000) {
    return `${(props.value / 1000000).toFixed(1)}M`
  }
  if (props.value >= 1000) {
    return `${(props.value / 1000).toFixed(1)}K`
  }
  return props.value.toString()
})

const iconBgClass = computed(() => ({
  primary: 'bg-primary-100 dark:bg-primary-900/30',
  secondary: 'bg-secondary-100 dark:bg-secondary-900/30',
  success: 'bg-success-100 dark:bg-success-900/30',
  danger: 'bg-danger-100 dark:bg-danger-900/30',
}[props.color]))

const iconColorClass = computed(() => ({
  primary: 'text-primary-600 dark:text-primary-400',
  secondary: 'text-secondary-600 dark:text-secondary-400',
  success: 'text-success-600 dark:text-success-400',
  danger: 'text-danger-600 dark:text-danger-400',
}[props.color]))
</script>
