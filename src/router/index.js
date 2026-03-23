import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/buckets',
    name: 'Buckets',
    component: () => import('../views/BucketsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/files/:bucket',
    name: 'Files',
    component: () => import('../views/FilesView.vue'),
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    // 检查登录状态
    if (!authStore.isLoggedIn) {
      await authStore.checkAuth()
    }
    
    if (!authStore.isLoggedIn) {
      next({ name: 'Login' })
      return
    }
  }
  
  // 已登录时不允许访问登录页
  if (to.name === 'Login' && authStore.isLoggedIn) {
    next({ name: 'Buckets' })
    return
  }
  
  next()
})

export default router
