<template>
  <header class="topbar-shell">
    <div class="topbar-user">
      <i class="ri-account-circle-fill text-sm"></i>
      <span class="truncate">{{ userInfo }}</span>
    </div>
    
    <div class="flex items-center gap-2">
      <button 
        v-if="showBack"
        class="btn btn-ghost px-3 py-2 text-xs"
        @click="handleBack"
      >
        <i class="ri-arrow-left-line mr-1"></i>
        {{ t('back') }}
      </button>
      
      <button
        class="btn btn-ghost px-3 py-2 text-xs"
        @click="handleLogout"
      >
        <i class="ri-logout-box-r-line mr-0"></i>
        {{ t('logout') }}
      </button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useI18nStore } from '../../stores/i18n'

const props = defineProps({
  showBack: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()
const authStore = useAuthStore()
const i18nStore = useI18nStore()

const t = (key) => i18nStore.t(key)

const userInfo = computed(() => {
  if (!authStore.config) return ''
  return `${authStore.accessKey} @ ${authStore.endPoint}:${authStore.port}`
})

function handleBack() {
  router.back()
}

async function handleLogout() {
  await authStore.logout()
  router.push({ name: 'Login' })
}
</script>
