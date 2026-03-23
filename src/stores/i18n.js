import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import zh from '../locales/zh'
import en from '../locales/en'

export const useI18nStore = defineStore('i18n', () => {
  const locale = ref(localStorage.getItem('lang') || 'zh')
  const messages = { zh, en }

  function t(key, params = {}) {
    let text = messages[locale.value]?.[key] || key
    Object.keys(params).forEach((param) => {
      text = text.replace(`{${param}}`, params[param])
    })
    return text
  }

  function setLocale(lang) {
    locale.value = lang
    localStorage.setItem('lang', lang)

    if (window.electronAPI?.menu) {
      window.electronAPI.menu.setLanguage(lang)
    }
  }

  function toggleLocale() {
    const nextLocale = locale.value === 'zh' ? 'en' : 'zh'
    setLocale(nextLocale)
    return nextLocale
  }

  const currentMessages = computed(() => messages[locale.value])

  return {
    locale,
    messages,
    t,
    setLocale,
    toggleLocale,
    currentMessages
  }
})
