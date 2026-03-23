import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const config = ref(null)
  const isLoggedIn = ref(false)
  const isLoading = ref(false)
  const error = ref(null)

  const endPoint = computed(() => config.value?.endPoint || '')
  const port = computed(() => config.value?.port || 9000)
  const accessKey = computed(() => config.value?.accessKey || '')
  const useSSL = computed(() => config.value?.useSSL || false)

  async function checkAuth() {
    try {
      const result = await window.electronAPI.config.get()
      if (result.success && result.data && result.data.accessKey) {
        config.value = result.data
        isLoggedIn.value = true
        return true
      }

      config.value = null
      isLoggedIn.value = false
      return false
    } catch (err) {
      console.error('Check auth error:', err)
      config.value = null
      isLoggedIn.value = false
      return false
    }
  }

  async function login(credentials) {
    isLoading.value = true
    error.value = null

    try {
      const result = await window.electronAPI.minio.login(credentials)

      if (result.success) {
        await window.electronAPI.config.set(credentials)

        const localConfig = { ...credentials }
        delete localConfig.secretKey
        localStorage.setItem('minioLoginConfig', JSON.stringify(localConfig))

        config.value = credentials
        isLoggedIn.value = true
        return { success: true }
      }

      error.value = result.error
      return { success: false, error: result.error }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function logout() {
    await window.electronAPI.config.clear()
    config.value = null
    isLoggedIn.value = false
    error.value = null
  }

  function getSavedConfig() {
    try {
      const saved = localStorage.getItem('minioLoginConfig')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  }

  return {
    config,
    isLoggedIn,
    isLoading,
    error,
    endPoint,
    port,
    accessKey,
    useSSL,
    checkAuth,
    login,
    logout,
    getSavedConfig
  }
})
