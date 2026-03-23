<template>
  <teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[50000] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      @click.self="handleOverlayClose"
    >
      <transition name="modal">
        <div 
          v-if="show"
          class="max-h-[90vh] max-w-[90vw] overflow-hidden rounded-[28px] border shadow-modal surface-panel"
          :class="[sizeClasses[size]]"
        >
          <!-- Header -->
          <div v-if="title" class="surface-header flex items-center justify-between px-4 py-4">
            <h3 class="text-lg font-semibold text-title">{{ title }}</h3>
            <button 
              v-if="closable"
              class="icon-button"
              @click="handleClose"
            >
              <i class="ri-close-line text-lg"></i>
            </button>
          </div>
          
          <!-- Content -->
          <div class="modal-body-surface max-h-[calc(90vh-120px)] overflow-y-auto p-4">
            <slot></slot>
          </div>
          
          <!-- Footer -->
          <div v-if="$slots.footer" class="surface-footer flex justify-end gap-3 px-4 py-4">
            <slot name="footer"></slot>
          </div>
        </div>
      </transition>
    </div>
  </teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v)
  },
  closable: {
    type: Boolean,
    default: true
  },
  closeOnClickOverlay: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['close', 'update:show'])

const sizeClasses = {
  sm: 'w-80',
  md: 'w-96',
  lg: 'w-[32rem]',
  xl: 'w-[48rem]'
}

function handleClose() {
  emit('close')
  emit('update:show', false)
}

function handleOverlayClose() {
  if (props.closeOnClickOverlay) {
    handleClose()
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
