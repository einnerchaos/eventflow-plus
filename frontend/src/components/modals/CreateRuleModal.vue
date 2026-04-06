<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div @click="$emit('close')" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
      <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Create New Rule</h3>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rule Name</label>
            <input v-model="form.name" type="text" required class="input-field" placeholder="e.g., User Signup Webhook" />
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea v-model="form.description" class="input-field" rows="2" placeholder="Optional description..."></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Type</label>
            <input v-model="form.eventType" type="text" required class="input-field" placeholder="e.g., user.created" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
            <input v-model.number="form.priority" type="number" min="1" max="100" class="input-field" />
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condition JSON</label>
            <textarea v-model="conditionsJson" required class="input-field font-mono text-sm" rows="6" placeholder='{"and": [{"field": "eventType", "operator": "equals", "value": "user.created"}]}'></textarea>
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Actions JSON</label>
            <textarea v-model="actionsJson" required class="input-field font-mono text-sm" rows="6" placeholder='[{"type": "webhook", "config": {"url": "https://api.example.com/webhook"}}]'></textarea>
          </div>

          <div class="col-span-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input v-model="form.isActive" type="checkbox" class="rounded" />
              <span class="text-sm text-gray-700 dark:text-gray-300">Active immediately</span>
            </label>
          </div>
        </div>

        <div v-if="error" class="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 text-sm">
          {{ error }}
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" @click="$emit('close')" class="btn-secondary">Cancel</button>
          <button type="submit" :disabled="loading" class="btn-primary">
            <span v-if="loading">Creating...</span>
            <span v-else>Create Rule</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { rulesApi } from '../../api/rules'

const emit = defineEmits<{
  close: []
  created: []
}>()

const form = reactive({
  name: '',
  description: '',
  eventType: '',
  priority: 10,
  isActive: true,
})

const conditionsJson = ref('')
const actionsJson = ref('')
const loading = ref(false)
const error = ref('')

const conditions = computed(() => {
  try {
    return JSON.parse(conditionsJson.value)
  } catch {
    return null
  }
})

const actions = computed(() => {
  try {
    const parsed = JSON.parse(actionsJson.value)
    return Array.isArray(parsed) ? parsed : null
  } catch (err) {
    console.error('Actions JSON parse error:', err)
    return null
  }
})

async function handleSubmit() {
  if (!conditions.value || !actions.value) {
    error.value = 'Invalid JSON format'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const payload = {
      ...form,
      conditions: conditions.value,
      actions: actions.value,
    }
    await rulesApi.createRule(payload)
    emit('created')
    emit('close')
  } catch (err: any) {
    console.error('Create rule error:', err)
    error.value = err.response?.data?.message || 'Failed to create rule'
  } finally {
    loading.value = false
  }
}
</script>
