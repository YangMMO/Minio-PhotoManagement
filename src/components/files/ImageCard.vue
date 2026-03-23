<template>
  <div
    class="image-card group relative"
    :class="{ selected }"
    :data-image-name="image.name"
    @click="$emit('click')"
  >
    <img :src="image.url" :alt="image.name" class="h-36 w-full object-cover" loading="lazy" />

    <button
      type="button"
      class="icon-only-button absolute right-3 top-3 border text-white opacity-0 backdrop-blur-md transition-all group-hover:opacity-100"
      style="background: rgba(15, 23, 42, 0.42); border-color: rgba(255, 255, 255, 0.12);"
      @click.stop="$emit('preview')"
    >
      <i class="ri-search-line"></i>
    </button>

    <div v-if="showFileName || showDate" class="border-t divider-theme px-3 py-3">
      <div v-if="showFileName" class="truncate text-sm font-medium text-title" :title="image.name">{{ image.name }}</div>
      <div v-if="showDate" class="mt-1 text-xs text-muted">{{ formatDate(image.lastModified) }}</div>
    </div>

    <div v-if="selected" class="absolute left-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary shadow-lg">
      <i class="ri-check-line text-sm text-white"></i>
    </div>
  </div>
</template>

<script setup>
defineProps({
  image: {
    type: Object,
    required: true
  },
  showFileName: {
    type: Boolean,
    default: true
  },
  showDate: {
    type: Boolean,
    default: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

defineEmits(['click', 'preview'])

function formatDate(date) {
  if (!date) {
    return ''
  }

  return new Date(date).toLocaleString()
}
</script>
