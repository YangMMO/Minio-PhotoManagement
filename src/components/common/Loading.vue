<template>
  <div 
    v-if="show"
    class="fixed inset-0 z-[25000] flex items-center justify-center bg-white/80 backdrop-blur-sm"
  >
    <div class="flex flex-col items-center gap-4">
      <i class="ri-loader-4-line text-4xl text-primary animate-spin"></i>
      <span v-if="text" class="text-gray-600">{{ text }}</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: ''
  }
})
</script>
