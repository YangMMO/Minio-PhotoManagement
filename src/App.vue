<template>
  <div class="app-shell">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <Toast />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useI18nStore } from './stores/i18n'
import { useThemeStore } from './stores/theme'
import Toast from './components/common/Toast.vue'

const i18nStore = useI18nStore()
const themeStore = useThemeStore()
let removeLanguageListener = null
let removeThemeListener = null

onMounted(() => {
  void themeStore.initialize()

  if (window.electronAPI?.menu) {
    removeLanguageListener = window.electronAPI.menu.onLanguageChange((language) => {
      i18nStore.setLocale(language)
    })

    removeThemeListener = window.electronAPI.menu.onThemeChange((theme) => {
      themeStore.setTheme(theme, { syncMenu: false })
    })

    window.electronAPI.menu.setLanguage(i18nStore.locale)
  }
})

onUnmounted(() => {
  if (typeof removeLanguageListener === 'function') {
    removeLanguageListener()
  }

  if (typeof removeThemeListener === 'function') {
    removeThemeListener()
  }
})
</script>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
