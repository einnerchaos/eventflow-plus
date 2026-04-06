import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'Layout',
      component: () => import('../views/LayoutView.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('../views/DashboardView.vue'),
          meta: { title: 'Dashboard', icon: 'HomeIcon' },
        },
        {
          path: 'events',
          name: 'Events',
          component: () => import('../views/EventsView.vue'),
          meta: { title: 'Events', icon: 'BoltIcon' },
        },
        {
          path: 'rules',
          name: 'Rules',
          component: () => import('../views/RulesView.vue'),
          meta: { title: 'Automation Rules', icon: 'Cog6ToothIcon' },
        },
        {
          path: 'executions',
          name: 'Executions',
          component: () => import('../views/ExecutionsView.vue'),
          meta: { title: 'Executions', icon: 'PlayCircleIcon' },
        },
        {
          path: 'sources',
          name: 'Sources',
          component: () => import('../views/SourcesView.vue'),
          meta: { title: 'Event Sources', icon: 'ServerStackIcon' },
        },
        {
          path: 'analytics',
          name: 'Analytics',
          component: () => import('../views/AnalyticsView.vue'),
          meta: { title: 'Analytics', icon: 'ChartBarIcon' },
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'NotFound',
      component: () => import('../views/NotFoundView.vue'),
    },
  ],
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (!to.meta.public && !authStore.isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
