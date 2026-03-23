<template>
  <teleport to="body">
    <div v-if="show" class="image-previewer" @click.self="handleClose">
      <button
        type="button"
        class="preview-nav-button preview-nav-button-left"
        :title="t('previousImage')"
        :disabled="!hasPreviousImage"
        @click.stop="navigateImage('prev')"
      >
        <i class="ri-arrow-left-s-line text-[1.625rem]"></i>
      </button>

      <button
        type="button"
        class="preview-nav-button preview-nav-button-right"
        :title="t('nextImage')"
        :disabled="!hasNextImage"
        @click.stop="navigateImage('next')"
      >
        <i class="ri-arrow-right-s-line text-[1.625rem]"></i>
      </button>

      <div class="surface-panel max-h-[95vh] max-w-[95vw] overflow-hidden rounded-[28px] shadow-modal">
        <div class="relative flex items-center justify-center" style="max-height: 60vh; background: linear-gradient(180deg, rgba(2, 6, 23, 0.92), rgba(15, 23, 42, 0.96));">
          <img v-if="currentUrl" :src="currentUrl" class="max-h-[60vh] max-w-full object-contain" />
          <button
            type="button"
            class="icon-only-button absolute right-4 top-4 border text-white backdrop-blur-md transition-colors hover:bg-white/15"
            style="background: rgba(15, 23, 42, 0.36); border-color: rgba(255, 255, 255, 0.1);"
            @click="handleClose"
          >
            <i class="ri-close-line text-xl"></i>
          </button>
        </div>

        <div class="modal-body-surface p-5">
          <div class="flex flex-col gap-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-base font-semibold text-title">{{ image?.name }}</div>
                <div class="mt-1 text-sm text-muted">{{ formatTime(currentInfo?.lastModified || originalInfo?.lastModified) }}</div>
              </div>
              <span class="inline-chip">
                {{ currentLabel }}
              </span>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="option in previewOptions"
                :key="option.type"
                type="button"
                class="rounded-xl border px-3 py-3 text-left transition-all"
                :class="{
                  'bg-blue-50 text-primary': currentType === option.type && !option.disabled,
                  'cursor-not-allowed opacity-60': option.disabled
                }"
                :disabled="option.disabled"
                @click="switchImage(option.type)"
              >
                <div class="flex items-center gap-2">
                  <i class="ri-image-line"></i>
                  <span class="text-sm font-medium">{{ option.label }}</span>
                </div>
                <div class="mt-2 flex items-center justify-between gap-3 text-xs">
                  <span class="text-subtle">{{ option.sizeText }}</span>
                  <span class="text-quiet">{{ option.dimensionText }}</span>
                </div>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18nStore } from '../../stores/i18n'
import { useAuthStore } from '../../stores/auth'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  image: {
    type: Object,
    default: null
  },
  bucket: {
    type: String,
    required: true
  },
  images: {
    type: Array,
    default: () => []
  },
  prefix: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:show', 'navigate'])

const i18nStore = useI18nStore()
const authStore = useAuthStore()
const t = (key) => i18nStore.t(key)

const currentType = ref('original')
const originalInfo = ref(null)
const thumbInfo = ref(null)
const watermarkInfo = ref(null)

const currentImageIndex = computed(() => props.images.findIndex((item) => item?.name === props.image?.name))
const hasPreviousImage = computed(() => currentImageIndex.value > 0)
const hasNextImage = computed(() => currentImageIndex.value >= 0 && currentImageIndex.value < props.images.length - 1)

const basePrefix = computed(() => {
  if (!props.prefix) {
    return ''
  }

  const normalized = props.prefix.endsWith('/') ? props.prefix : `${props.prefix}/`
  return normalized.replace(/(thumb|original|watermark)\/$/, '')
})

function buildObjectPath(type) {
  if (!props.image?.name) {
    return ''
  }

  return `${basePrefix.value}${type}/${props.image.name}`
}

function buildObjectUrl(objectPath) {
  const protocol = authStore.useSSL ? 'https' : 'http'
  const encodedBucket = encodeURIComponent(props.bucket)
  const encodedPath = objectPath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  return `${protocol}://${authStore.endPoint}:${authStore.port}/${encodedBucket}/${encodedPath}`
}

const currentUrl = computed(() => {
  const objectPath = buildObjectPath(currentType.value)
  return objectPath ? buildObjectUrl(objectPath) : ''
})

const currentInfo = computed(() => {
  if (currentType.value === 'thumb') {
    return thumbInfo.value
  }

  if (currentType.value === 'watermark') {
    return watermarkInfo.value?.exists ? watermarkInfo.value : null
  }

  return originalInfo.value
})

const currentLabel = computed(() => {
  if (currentType.value === 'thumb') {
    return t('Thumbnail')
  }

  if (currentType.value === 'watermark') {
    return t('watermarkImage')
  }

  return t('OriginalImage')
})

const previewOptions = computed(() => [
  {
    type: 'original',
    label: t('OriginalImage'),
    disabled: false,
    sizeText: formatSize(originalInfo.value?.size) || '-',
    dimensionText: originalInfo.value?.dimensions || t('SizeLoading')
  },
  {
    type: 'thumb',
    label: t('Thumbnail'),
    disabled: false,
    sizeText: formatSize(thumbInfo.value?.size) || '-',
    dimensionText: thumbInfo.value?.dimensions || t('SizeLoading')
  },
  {
    type: 'watermark',
    label: t('watermarkImage'),
    disabled: !watermarkInfo.value?.exists,
    sizeText: watermarkInfo.value?.exists ? (formatSize(watermarkInfo.value?.size) || '-') : t('Not'),
    dimensionText: watermarkInfo.value?.exists ? (watermarkInfo.value?.dimensions || t('SizeLoading')) : t('Not')
  }
])

watch(
  () => [props.show, props.image?.name, props.prefix],
  async ([visible]) => {
    if (!visible || !props.image?.name) {
      return
    }

    currentType.value = 'original'
    await loadImageInfo()
  }
)

async function loadImageInfo() {
  originalInfo.value = null
  thumbInfo.value = null
  watermarkInfo.value = null

  try {
    const originalResult = await window.electronAPI.minio.statObject(props.bucket, buildObjectPath('original'))
    if (originalResult.success) {
      originalInfo.value = {
        size: originalResult.stat.size,
        lastModified: originalResult.stat.lastModified
      }
    }
  } catch (error) {
    console.warn('Original image not found:', error)
  }

  try {
    const thumbResult = await window.electronAPI.minio.statObject(props.bucket, buildObjectPath('thumb'))
    if (thumbResult.success) {
      thumbInfo.value = {
        size: thumbResult.stat.size
      }
    }
  } catch (error) {
    console.warn('Thumbnail not found:', error)
  }

  try {
    const watermarkResult = await window.electronAPI.minio.statObject(props.bucket, buildObjectPath('watermark'))
    if (watermarkResult.success) {
      watermarkInfo.value = {
        exists: true,
        size: watermarkResult.stat.size
      }
    } else {
      watermarkInfo.value = { exists: false }
    }
  } catch {
    watermarkInfo.value = { exists: false }
  }

  await loadDimensions()
}

async function loadDimensions() {
  if (originalInfo.value) {
    originalInfo.value = {
      ...originalInfo.value,
      dimensions: await probeDimensions(buildObjectUrl(buildObjectPath('original')))
    }
  }

  if (thumbInfo.value) {
    thumbInfo.value = {
      ...thumbInfo.value,
      dimensions: await probeDimensions(buildObjectUrl(buildObjectPath('thumb')))
    }
  }

  if (watermarkInfo.value?.exists) {
    watermarkInfo.value = {
      ...watermarkInfo.value,
      dimensions: await probeDimensions(buildObjectUrl(buildObjectPath('watermark')))
    }
  }
}

function probeDimensions(url) {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => resolve(`${image.width} x ${image.height}`)
    image.onerror = () => resolve(t('Not'))
    image.src = url
  })
}

function switchImage(type) {
  currentType.value = type
}

function navigateImage(direction) {
  if (!props.show || currentImageIndex.value < 0) {
    return
  }

  const targetIndex = direction === 'prev' ? currentImageIndex.value - 1 : currentImageIndex.value + 1
  const targetImage = props.images[targetIndex]

  if (!targetImage) {
    return
  }

  emit('navigate', targetImage)
}

function handleClose() {
  emit('update:show', false)
}

function handleKeydown(event) {
  if (!props.show) {
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    navigateImage('prev')
    return
  }

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    navigateImage('next')
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    handleClose()
  }
}

function formatSize(bytes) {
  if (!bytes) {
    return ''
  }

  return `${(bytes / 1024).toFixed(1)} KB`
}

function formatTime(date) {
  if (!date) {
    return ''
  }

  return new Date(date).toLocaleString()
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>
