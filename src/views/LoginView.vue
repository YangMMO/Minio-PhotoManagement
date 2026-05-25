<template>
  <div
    class="page-shell flex min-h-screen flex-col items-center justify-center overflow-hidden p-4"
    :style="{ backgroundImage: `url(${bgImage})` }"
  >
    <div class="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]"></div>

    <div class="relative z-[1] w-full max-w-[26rem] rounded-[28px] border p-7 shadow-modal surface-panel">
      <div class="mb-6 flex items-center justify-between">
        <div class="inline-chip">MinIO Desktop</div>
        <img :src="iconImage" alt="App icon" class="h-12 w-12 rounded-2xl border divider-theme surface-panel-muted" />
      </div>

      <div class="mb-6">
        <h1 class="text-2xl font-semibold tracking-tight text-title">MinIO {{ i18nStore.t('login') }}</h1>
        <p class="mt-2 text-sm text-muted">{{ i18nStore.t('loginSubtitle') }}</p>
      </div>

      <form class="space-y-4" @submit.prevent="handleLogin">
        <div>
          <label class="mb-1 block text-sm font-medium text-subtle">{{ i18nStore.t('endpoint') }}</label>
          <input v-model="form.endPoint" type="text" class="input" :placeholder="i18nStore.t('endpointPlaceholder')" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-subtle">{{ i18nStore.t('port') }}</label>
          <input v-model="form.port" type="text" class="input" :placeholder="i18nStore.t('portPlaceholder')" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-subtle">{{ i18nStore.t('accessKey') }}</label>
          <input v-model="form.accessKey" type="text" class="input" :placeholder="i18nStore.t('accessKeyPlaceholder')" />
        </div>

        <div>
          <label class="mb-1 block text-sm font-medium text-subtle">{{ i18nStore.t('secretKey') }}</label>
          <input v-model="form.secretKey" type="password" class="input" :placeholder="i18nStore.t('secretKeyPlaceholder')" />
        </div>

        <label class="flex items-center text-sm text-subtle">
          <input
            id="useSSL"
            v-model="form.useSSL"
            type="checkbox"
            class="h-4 w-4 rounded divider-theme bg-transparent text-primary focus:ring-primary"
          />
          <span class="ml-2">{{ i18nStore.t('useSSL') }}</span>
        </label>

        <button type="submit" class="btn btn-primary w-full" :disabled="isLoading">
          <i v-if="isLoading" class="ri-loader-4-line animate-spin"></i>
          <span>{{ isLoading ? i18nStore.t('loggingIn') : i18nStore.t('login') }}</span>
        </button>

        <p v-if="error" class="text-center text-sm text-red-400">{{ error }}</p>
      </form>
    </div>

    <footer class="relative z-[1] mt-5 text-center text-xs text-slate-200/80">
      <a href="https://www.mmoo.fun" target="_self" class="hover:text-primary">© 2025 MMOO.FUN, All rights reserved.</a>

    </footer>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useI18nStore } from '../stores/i18n'
import bgImage from '../../assets/bg.jpg'
import iconImage from '../../assets/icon.png'

const router = useRouter()
const authStore = useAuthStore()
const i18nStore = useI18nStore()

const form = reactive({
  endPoint: '',
  port: '',
  accessKey: '',
  secretKey: '',
  useSSL: false
})

const isLoading = ref(false)
const error = ref('')

onMounted(() => {
  const saved = authStore.getSavedConfig()
  if (!saved) {
    return
  }

  form.endPoint = saved.endPoint || ''
  form.port = saved.port ? String(saved.port) : ''
  form.accessKey = saved.accessKey || ''
  form.useSSL = Boolean(saved.useSSL)
})

async function handleLogin() {
  if (!form.endPoint || !form.port || !form.accessKey || !form.secretKey) {
    error.value = i18nStore.t('allFieldsRequired')
    return
  }

  isLoading.value = true
  error.value = ''

  try {
    const result = await authStore.login({
      endPoint: form.endPoint.trim(),
      port: Number.parseInt(form.port, 10),
      accessKey: form.accessKey.trim(),
      secretKey: form.secretKey.trim(),
      useSSL: form.useSSL
    })

    if (result.success) {
      router.push({ name: 'Buckets' })
      return
    }

    error.value = i18nStore.t('loginFailed')
  } catch (loginError) {
    console.error('Login error:', loginError)
    error.value = i18nStore.t('unknownError')
  } finally {
    isLoading.value = false
  }
}
</script>
