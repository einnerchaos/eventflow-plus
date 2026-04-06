<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-secondary-900">
    <div class="text-center">
      <div class="w-24 h-24 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-8">
        <span class="text-5xl font-bold text-white">404</span>
      </div>
      <h1 class="text-3xl font-bold text-white mb-4">Page Not Found</h1>
      <p class="text-gray-300 mb-8">The page you're looking for doesn't exist.</p>
      <RouterLink to="/dashboard" class="inline-flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-colors">
        <ArrowLeftIcon class="w-5 h-5" />
        Back to Dashboard
      </RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftIcon } from '@heroicons/vue/24/outline'
</script>
