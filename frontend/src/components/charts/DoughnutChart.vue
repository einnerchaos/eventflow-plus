<template>
  <Doughnut
    v-if="chartData"
    :data="chartData"
    :options="mergedOptions"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'
import { Doughnut } from 'vue-chartjs'

ChartJS.register(ArcElement, Tooltip, Legend)

const props = defineProps<{
  data: any
  options?: any
}>()

const chartData = computed(() => props.data)

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      padding: 12,
      cornerRadius: 8,
    },
  },
  cutout: '70%',
}

const mergedOptions = computed(() => ({
  ...defaultOptions,
  ...props.options,
}))
</script>
