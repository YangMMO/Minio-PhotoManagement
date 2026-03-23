<template>
  <div class="image-grid grid gap-3" style="grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));">
    <ImageCard
      v-for="image in images"
      :key="image.name"
      :image="image"
      :show-file-name="showFileName"
      :show-date="showDate"
      :selected="selected.has(image.name)"
      @click="$emit('select', image.name)"
      @preview="$emit('preview', image)"
    />
  </div>
</template>

<script setup>
import ImageCard from './ImageCard.vue'

defineProps({
  images: {
    type: Array,
    default: () => []
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
    type: Set,
    default: () => new Set()
  }
})

defineEmits(['select', 'preview'])
</script>
