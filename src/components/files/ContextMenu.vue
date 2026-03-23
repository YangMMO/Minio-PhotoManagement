<template>
  <teleport to="body">
    <div class="context-menu" :style="{ left: `${position.x}px`, top: `${position.y}px` }">
      <ul class="py-1">
        <li class="context-menu-item" @click="$emit('create')">
          <i class="ri-folder-add-line"></i>
          {{ t('createFolder') }}
        </li>
        <li class="context-menu-item" style="color: var(--danger);" @click="$emit('delete')">
          <i class="ri-delete-bin-line"></i>
          {{ t('deleteFolder') }}
        </li>
      </ul>
    </div>
  </teleport>
</template>

<script setup>
import { useI18nStore } from '../../stores/i18n'

defineProps({
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

defineEmits(['create', 'delete', 'close'])

const i18nStore = useI18nStore()
const t = (key) => i18nStore.t(key)
</script>
