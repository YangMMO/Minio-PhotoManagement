import { defineStore } from 'pinia'
import { ref } from 'vue'

const allowedThemes = new Set(['light', 'dark'])

function normalizeTheme(theme) {
  return allowedThemes.has(theme) ? theme : 'light'
}

function applyTheme(theme) {
  if (typeof document === 'undefined') {
    return
  }

  document.documentElement.setAttribute('data-theme', theme)
  document.body?.setAttribute('data-theme', theme)
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref(normalizeTheme(localStorage.getItem('theme') || 'light'))
  const initialized = ref(false)
  applyTheme(theme.value)

  async function initialize() {
    if (initialized.value) {
      applyTheme(theme.value)
      return
    }

    let nextTheme = normalizeTheme(localStorage.getItem('theme') || 'light')

    if (window.electronAPI?.settings) {
      try {
        const result = await window.electronAPI.settings.get('theme')
        if (result.success && result.value) {
          nextTheme = normalizeTheme(result.value)
        }
      } catch (error) {
        console.warn('Failed to load theme setting:', error)
      }
    }

    theme.value = nextTheme
    localStorage.setItem('theme', nextTheme)
    applyTheme(nextTheme)

    if (window.electronAPI?.menu) {
      window.electronAPI.menu.setTheme(nextTheme)
    }

    initialized.value = true
  }

  function setTheme(nextTheme, options = {}) {
    const { syncMenu = true } = options
    const resolvedTheme = normalizeTheme(nextTheme)

    theme.value = resolvedTheme
    localStorage.setItem('theme', resolvedTheme)
    applyTheme(resolvedTheme)

    if (syncMenu && window.electronAPI?.menu) {
      window.electronAPI.menu.setTheme(resolvedTheme)
    }
  }

  function toggleTheme() {
    setTheme(theme.value === 'light' ? 'dark' : 'light')
  }

  return {
    theme,
    initialized,
    initialize,
    setTheme,
    toggleTheme
  }
})
