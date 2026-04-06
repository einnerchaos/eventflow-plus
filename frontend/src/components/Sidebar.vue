<template>
  <aside 
    class="fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl lg:shadow-none transform transition-transform duration-300"
    :class="{ '-translate-x-full lg:translate-x-0': !mobileMenuOpen }"
  >
    <div class="flex flex-col h-full">
      <div class="p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg">
            <BoltIcon class="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 class="text-lg font-bold text-gray-900 dark:text-white">
              EventFlow<span class="gradient-text">+</span>
            </h1>
            <p class="text-xs text-gray-500 dark:text-gray-400">Admin Dashboard</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
        <a
          v-for="item in menuItems"
          :key="item.name"
          @click.prevent="navigateTo(item.path)"
          :class="[
            'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer',
            $route.path === item.path
              ? 'bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 text-primary-600 dark:text-primary-400'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
          ]"
        >
          <component :is="item.icon" class="w-5 h-5" />
          {{ item.name }}
        </a>
      </nav>

      <div class="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          @click="handleLogout"
          class="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
        >
          <ArrowLeftOnRectangleIcon class="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  </aside>

  <div 
    v-if="mobileMenuOpen" 
    @click="mobileMenuOpen = false"
    class="fixed inset-0 bg-black/50 z-40 lg:hidden"
  ></div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  HomeIcon,
  BoltIcon,
  Cog6ToothIcon,
  PlayCircleIcon,
  ServerStackIcon,
  ChartBarIcon,
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
} from '@heroicons/vue/24/outline'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { isDark } = storeToRefs(authStore)

const mobileMenuOpen = ref(false)

const menuItems = [
  { name: 'Dashboard', path: '/dashboard', icon: HomeIcon },
  { name: 'Events', path: '/events', icon: BoltIcon },
  { name: 'Automation Rules', path: '/rules', icon: Cog6ToothIcon },
  { name: 'Executions', path: '/executions', icon: PlayCircleIcon },
  { name: 'Event Sources', path: '/sources', icon: ServerStackIcon },
  { name: 'Analytics', path: '/analytics', icon: ChartBarIcon },
]

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

function navigateTo(path: string) {
  router.push(path)
}
</script>
