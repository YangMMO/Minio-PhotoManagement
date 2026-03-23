<template>
  <teleport to="body">
    <transition name="toast">
      <div 
        v-if="visible"
        class="toast fixed bottom-5 right-5 z-[30000]"
        :class="toastClasses"
      >
        <div class="flex items-center gap-2">
          <i :class="iconClass"></i>
          <span>{{ message }}</span>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useToast } from '../../composables/useToast'

const visible = ref(false)
const message = ref('')
const type = ref('info')

const toastClasses = computed(() => ({
  'toast-info': type.value === 'info',
  'toast-success': type.value === 'success',
  'toast-error': type.value === 'error',
  'toast-warning': type.value === 'warning'
}))

const iconClass = computed(() => ({
  'ri-information-line': type.value === 'info',
  'ri-check-line': type.value === 'success',
  'ri-close-line': type.value === 'error',
  'ri-alert-line': type.value === 'warning'
}))

let timeout = null

function show(msg, duration = 3000, t = 'info') {
  message.value = msg
  type.value = t
  visible.value = true
  
  if (timeout) clearTimeout(timeout)
  timeout = setTimeout(() => {
    visible.value = false
  }, duration)
}

// 监听全局 toast 事件
const { onShow } = useToast()

onMounted(() => {
  onShow(show)
})
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
