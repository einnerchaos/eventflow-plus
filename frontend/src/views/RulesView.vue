<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Automation Rules</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1">
          Manage event processing rules and actions
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button @click="showCreateModal = true" class="btn-primary">
          <PlusIcon class="w-4 h-4 mr-2" />
          New Rule
        </button>
      </div>
    </div>

    <div class="glass-panel rounded-xl p-4">
      <div class="flex items-center gap-4">
        <input
          v-model="searchQuery"
          type="text"
          class="input-field flex-1"
          placeholder="Search rules..."
        />
        <select v-model="filterActive" class="input-field w-48">
          <option value="">All Rules</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <RuleCard
        v-for="rule in filteredRules"
        :key="rule.id"
        :rule="rule"
        @toggle="toggleRule"
        @edit="editRule"
        @delete="deleteRule"
      />
    </div>

    <CreateRuleModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="handleRuleCreated"
    />

    <EditRuleModal
      v-if="showEditModal && editingRule"
      :rule="editingRule"
      @close="showEditModal = false"
      @updated="handleRuleUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PlusIcon } from '@heroicons/vue/24/outline'
import { rulesApi, type Rule } from '../api/rules'
import RuleCard from '../components/RuleCard.vue'
import CreateRuleModal from '../components/modals/CreateRuleModal.vue'
import EditRuleModal from '../components/modals/EditRuleModal.vue'

const rules = ref<Rule[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterActive = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)
const editingRule = ref<Rule | null>(null)

const filteredRules = computed(() => {
  let result = rules.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(rule =>
      rule.name.toLowerCase().includes(query) ||
      rule.eventType.toLowerCase().includes(query)
    )
  }

  if (filterActive.value) {
    const isActive = filterActive.value === 'true'
    result = result.filter(rule => rule.isActive === isActive)
  }

  return result
})

async function loadRules() {
  loading.value = true
  try {
    const response = await rulesApi.getRules({ limit: 100 })
    rules.value = response.data
  } catch (err) {
    console.error('Failed to load rules:', err)
  } finally {
    loading.value = false
  }
}

async function toggleRule(rule: Rule) {
  try {
    await rulesApi.toggleActive(rule.id, !rule.isActive)
    await loadRules()
  } catch (err) {
    console.error('Failed to toggle rule:', err)
  }
}

function editRule(rule: Rule) {
  editingRule.value = rule
  showEditModal.value = true
}

async function deleteRule(rule: Rule) {
  if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) return
  
  try {
    await rulesApi.deleteRule(rule.id)
    await loadRules()
  } catch (err) {
    console.error('Failed to delete rule:', err)
  }
}

function handleRuleCreated() {
  showCreateModal.value = false
  loadRules()
}

function handleRuleUpdated() {
  showEditModal.value = false
  editingRule.value = null
  loadRules()
}

onMounted(loadRules)
</script>
