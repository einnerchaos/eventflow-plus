<template>
  <header class="h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
    <div class="flex items-center gap-4">
      <button
        @click="toggleMobileMenu"
        class="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
      >
        <Bars3Icon class="w-6 h-6" />
      </button>
      
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
        {{ pageTitle }}
      </h2>
    </div>

    <div class="flex items-center gap-4">
      <button
        @click="toggleTheme"
        class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        :title="isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
      >
        <SunIcon v-if="isDark" class="w-5 h-5" />
        <MoonIcon v-else class="w-5 h-5" />
      </button>

      <div class="relative">
        <button
          @click="showNotifications = !showNotifications"
          class="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
        >
          <BellIcon class="w-5 h-5" />
          <span v-if="unreadCount > 0" class="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full"></span>
        </button>
      </div>

      <div class="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
        <div class="text-right hidden sm:block">
          <p class="text-sm font-medium text-gray-900 dark:text-white">{{ user?.email }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400 capitalize">{{ user?.role }}</p>
        </div>
        <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-medium">
          {{ user?.email?.charAt(0).toUpperCase() || 'A' }}
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import {
  Bars3Icon,
  SunIcon,
  MoonIcon,
  BellIcon,
} from '@heroicons/vue/24/outline'
import { useThemeStore } from '../stores/theme'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const themeStore = useThemeStore()
const authStore = useAuthStore()

const { isDark } = storeToRefs(themeStore)
const { user } = storeToRefs(authStore)

const showNotifications = ref(false)
const unreadCount = ref(0)

const pageTitle = computed(() => {
  return (route.meta.title as string) || 'Dashboard'
})

function toggleTheme() {
  themeStore.toggleTheme()
}

function toggleMobileMenu() {
}
</script>
