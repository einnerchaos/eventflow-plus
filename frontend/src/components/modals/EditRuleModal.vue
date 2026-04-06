<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div @click="$emit('close')" class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    <div class="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
      <div class="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <h3 class="text-xl font-bold text-gray-900 dark:text-white">Edit Rule</h3>
      </div>

      <form @submit.prevent="handleSubmit" class="p-6 space-y-6">
        <div class="grid grid-cols-2 gap-4">
          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rule Name</label>
            <input v-model="form.name" type="text" required class="input-field" />
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
            <textarea v-model="form.description" class="input-field" rows="2"></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Event Type</label>
            <input v-model="form.eventType" type="text" required class="input-field" />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
            <input v-model.number="form.priority" type="number" min="1" max="100" class="input-field" />
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Condition JSON</label>
            <textarea v-model="conditionsJson" required class="input-field font-mono text-sm" rows="6"></textarea>
          </div>

          <div class="col-span-2">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Actions JSON</label>
            <textarea v-model="actionsJson" required class="input-field font-mono text-sm" rows="6"></textarea>
          </div>
        </div>

        <div v-if="error" class="p-3 rounded-lg bg-danger-50 dark:bg-danger-900/30 text-danger-600 dark:text-danger-400 text-sm">
          {{ error }}
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" @click="$emit('close')" class="btn-secondary">Cancel</button>
          <button type="submit" :disabled="loading" class="btn-primary">
            <span v-if="loading">Saving...</span>
            <span v-else>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from 'vue'
import { rulesApi, type Rule } from '../../api/rules'

const props = defineProps<{
  rule: Rule
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const form = reactive({
  name: props.rule.name,
  description: props.rule.description || '',
  eventType: props.rule.eventType,
  priority: props.rule.priority,
})

const conditionsJson = ref(JSON.stringify(props.rule.conditions, null, 2))
const actionsJson = ref(JSON.stringify(props.rule.actions, null, 2))
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
    return JSON.parse(actionsJson.value)
  } catch {
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
    await rulesApi.updateRule(props.rule.id, {
      ...form,
      conditions: conditions.value,
      actions: actions.value,
    })
    emit('updated')
    emit('close')
  } catch (err: any) {
    error.value = err.response?.data?.message || 'Failed to update rule'
  } finally {
    loading.value = false
  }
}
</script>
