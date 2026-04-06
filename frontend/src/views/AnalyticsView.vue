<template>
  <div class="space-y-6">
    <div>
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
      <p class="text-gray-500 dark:text-gray-400 mt-1">
        Advanced metrics and performance insights
      </p>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="glass-panel rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Event Distribution</h3>
        <div class="h-48">
          <DoughnutChart
            v-if="eventDistributionChart"
            :data="eventDistributionChart"
            :options="{ responsive: true, maintainAspectRatio: false }"
          />
        </div>
      </div>

      <div class="lg:col-span-2 glass-panel rounded-xl p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Execution Trends</h3>
        <div class="h-48">
          <LineChart
            v-if="executionTrendsChart"
            :data="executionTrendsChart"
            :options="{ responsive: true, maintainAspectRatio: false }"
          />
        </div>
      </div>
    </div>

    <div class="glass-panel rounded-xl p-6">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Performing Rules</h3>
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rule</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Executions</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Success Rate</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Avg Duration</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Trend</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="rule in topRules" :key="rule.id">
              <td class="px-6 py-4 font-medium text-gray-900 dark:text-white">{{ rule.name }}</td>
              <td class="px-6 py-4 text-gray-600 dark:text-gray-300">{{ rule.executions.toLocaleString() }}</td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-2">
                  <div class="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full rounded-full" :class="rule.successRate > 90 ? 'bg-success-500' : rule.successRate > 70 ? 'bg-warning-500' : 'bg-danger-500'" :style="{ width: `${rule.successRate}%` }"></div>
                  </div>
                  <span class="text-sm font-medium">{{ rule.successRate }}%</span>
                </div>
              </td>
              <td class="px-6 py-4 text-gray-600 dark:text-gray-300">{{ rule.avgDuration }}ms</td>
              <td class="px-6 py-4">
                <component :is="rule.trend === 'up' ? ArrowTrendingUpIcon : ArrowTrendingDownIcon" :class="rule.trend === 'up' ? 'text-success-500' : 'text-danger-500'" class="w-5 h-5" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/vue/24/outline'
import DoughnutChart from '../components/charts/DoughnutChart.vue'
import LineChart from '../components/charts/LineChart.vue'

const eventDistributionChart = ref(null)
const executionTrendsChart = ref(null)

const topRules = ref([
  { id: '1', name: 'User Signup Webhook', executions: 5234, successRate: 98, avgDuration: 245, trend: 'up' },
  { id: '2', name: 'Payment Notification', executions: 3891, successRate: 94, avgDuration: 189, trend: 'up' },
  { id: '3', name: 'Email Verification', executions: 2845, successRate: 99, avgDuration: 312, trend: 'down' },
  { id: '4', name: 'Slack Alert', executions: 1923, successRate: 87, avgDuration: 456, trend: 'up' },
])

onMounted(() => {
  eventDistributionChart.value = {
    labels: ['User Events', 'Payment Events', 'System Events', 'Notifications'],
    datasets: [{
      data: [45, 25, 15, 15],
      backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#d946ef'],
    }],
  }

  executionTrendsChart.value = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Success',
        data: [450, 520, 480, 600, 580, 420, 380],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
      },
      {
        label: 'Failed',
        data: [12, 8, 15, 6, 10, 5, 3],
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
      },
    ],
  }
})
</script>
