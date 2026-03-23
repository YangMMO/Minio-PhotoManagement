<template>
  <div 
    class="bucket-card group cursor-pointer"
    @click="$emit('click')"
  >
    <div class="relative z-[1] flex min-w-0 items-center gap-4">
      <div class="bucket-icon-shell">
        <i class="ri-folder-5-fill text-[1.75rem]"></i>
      </div>
      <div class="min-w-0">
        <div class="truncate text-sm font-semibold text-title">
          {{ bucket.name }}
        </div>
        <div class="bucket-meta">
          <i class="ri-time-line"></i>
          <span>{{ formatDate(bucket.creationDate) }}</span>
        </div>
      </div>
    </div>

    <div class="relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border divider-theme text-muted transition-colors duration-200 group-hover:text-title">
      <i class="ri-arrow-right-s-line text-lg"></i>
    </div>
  </div>
</template>

<script setup>
defineProps({
  bucket: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString()
}
</script>
