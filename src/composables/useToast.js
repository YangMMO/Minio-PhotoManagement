import { ref } from 'vue'

const listeners = ref([])

export function useToast() {
  function show(message, duration = 3000, type = 'info') {
    listeners.value.forEach(listener => listener(message, duration, type))
  }

  function onShow(callback) {
    listeners.value.push(callback)
    
    // 返回取消订阅函数
    return () => {
      const index = listeners.value.indexOf(callback)
      if (index > -1) {
        listeners.value.splice(index, 1)
      }
    }
  }

  function success(message, duration = 3000) {
    show(message, duration, 'success')
  }

  function error(message, duration = 4000) {
    show(message, duration, 'error')
  }

  function warning(message, duration = 3500) {
    show(message, duration, 'warning')
  }

  function info(message, duration = 3000) {
    show(message, duration, 'info')
  }

  return {
    show,
    onShow,
    success,
    error,
    warning,
    info
  }
}
