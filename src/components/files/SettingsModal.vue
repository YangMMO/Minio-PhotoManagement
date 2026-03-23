<template>
  <Modal
    :show="show"
    :title="settingsTitle"
    :size="modalSize"
    :close-on-click-overlay="false"
    @update:show="emit('update:show', $event)"
  >
    <div class="space-y-6">
      <div>
        <label class="mb-2 block text-sm font-medium text-gray-700">
          {{ type === 'thumbnail' ? t('setSize1') : t('setWSize1') }}
        </label>
        <input v-model.number="size" type="number" class="input" min="100" max="2000" />
        <p class="mt-1 text-xs text-gray-500">
          {{ type === 'thumbnail' ? t('setSize2') : t('setWSize2') }}
        </p>
      </div>

      <template v-if="type === 'watermark'">
        <div class="border-t border-gray-200 pt-4">
          <div class="mb-4 flex items-center gap-4">
            <button class="btn btn-secondary" type="button" @click="handleUploadWatermark">
              <i class="ri-image-add-line"></i>
              {{ t('uploadWatermark') }}
            </button>
            <button v-if="watermarkPreview" class="btn btn-danger" type="button" @click="handleRemoveWatermark">
              <i class="ri-delete-bin-line"></i>
              {{ t('removeWatermark') }}
            </button>
            <span class="text-sm text-gray-500">
              {{ watermarkPreview ? t('uploaded') : t('notUploaded') }}
            </span>
          </div>

          <p class="mb-4 text-xs text-gray-500">{{ t('watermarkLocalTip') }}</p>

          <div class="grid grid-cols-3 gap-4">
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">{{ t('watermarkRatio') }}</label>
              <input v-model.number="ratio" type="number" class="input" min="1" max="10" />
            </div>
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">{{ t('watermarkOpacity') }}</label>
              <input v-model.number="opacity" type="number" class="input" min="1" max="100" />
            </div>
            <div>
              <label class="mb-2 block text-sm font-medium text-gray-700">{{ t('watermarkPosition') }}</label>
              <select v-model="watermarkPosition" class="input">
                <option
                  v-for="option in watermarkPositionOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="mt-4">
            <div class="mb-2 text-sm font-medium text-gray-700">{{ t('preview') }}</div>
            <div class="relative h-48 overflow-hidden rounded-lg bg-cover bg-center" :style="{ backgroundImage: `url(${exampleImage})` }">
              <div class="pointer-events-none absolute inset-0 grid" :style="{ gridTemplateColumns: `repeat(${safeRatio}, 1fr)` }">
                <div
                  v-for="index in safeRatio"
                  :key="index"
                  class="relative border-r border-white/30 last:border-r-0"
                ></div>
              </div>
              <img
                v-if="watermarkPreview"
                :src="watermarkPreview"
                class="pointer-events-none absolute"
                :style="previewWatermarkStyle"
              />
            </div>
          </div>
        </div>
      </template>
    </div>

    <template #footer>
      <button class="btn btn-secondary" type="button" @click="handleCancel">{{ t('cancel') }}</button>
      <button class="btn btn-primary" type="button" @click="handleSave">{{ t('save') }}</button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useI18nStore } from '../../stores/i18n'
import { useMinioStore } from '../../stores/minio'
import Modal from '../common/Modal.vue'
import exampleImage from '../../../assets/Example.png'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'thumbnail',
    validator: (value) => ['thumbnail', 'watermark'].includes(value)
  }
})

const emit = defineEmits(['update:show'])

const i18nStore = useI18nStore()
const minioStore = useMinioStore()
const t = (key) => i18nStore.t(key)

const size = ref(480)
const ratio = ref(4)
const opacity = ref(80)
const watermarkPosition = ref('top-left')
const watermarkPreview = ref(null)

const safeRatio = computed(() => Math.min(10, Math.max(1, Number(ratio.value) || 1)))
const safeOpacity = computed(() => Math.min(100, Math.max(1, Number(opacity.value) || 1)))
const safePosition = computed(() => {
  const allowed = new Set(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'])
  return allowed.has(watermarkPosition.value) ? watermarkPosition.value : 'top-left'
})
const settingsTitle = computed(() => (props.type === 'thumbnail' ? t('ThumbnailSize') : t('WatermarkSize')))
const modalSize = computed(() => (props.type === 'watermark' ? 'xl' : 'lg'))
const watermarkPositionOptions = computed(() => [
  { value: 'top-left', label: t('watermarkTopLeft') },
  { value: 'top-right', label: t('watermarkTopRight') },
  { value: 'center', label: t('watermarkCenter') },
  { value: 'bottom-left', label: t('watermarkBottomLeft') },
  { value: 'bottom-right', label: t('watermarkBottomRight') }
])
const previewWatermarkStyle = computed(() => {
  const style = {
    width: `${100 / safeRatio.value}%`,
    height: 'auto',
    maxHeight: '100%',
    opacity: safeOpacity.value / 100
  }

  if (safePosition.value === 'top-left') {
    return { ...style, left: '0', top: '0' }
  }

  if (safePosition.value === 'top-right') {
    return { ...style, right: '0', top: '0' }
  }

  if (safePosition.value === 'bottom-left') {
    return { ...style, left: '0', bottom: '0' }
  }

  if (safePosition.value === 'bottom-right') {
    return { ...style, right: '0', bottom: '0' }
  }

  return {
    ...style,
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)'
  }
})

watch(() => props.show, (visible) => {
  if (!visible) {
    return
  }

  if (props.type === 'thumbnail') {
    size.value = minioStore.thumbnailSize
    return
  }

  size.value = minioStore.watermarkSize
  ratio.value = minioStore.watermarkRatio
  opacity.value = minioStore.watermarkOpacity
  watermarkPosition.value = minioStore.watermarkPosition
  watermarkPreview.value = minioStore.watermarkImage
})

function handleUploadWatermark() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/png'

  input.onchange = (event) => {
    const file = event.target.files[0]
    if (!file) {
      return
    }

    if (file.type !== 'image/png') {
      window.alert(t('pngOnly'))
      return
    }

    const reader = new FileReader()
    reader.onload = (loadEvent) => {
      watermarkPreview.value = loadEvent.target.result
    }
    reader.readAsDataURL(file)
  }

  input.click()
}

function handleRemoveWatermark() {
  watermarkPreview.value = null
}

function handleCancel() {
  emit('update:show', false)
}

function handleSave() {
  if (props.type === 'thumbnail') {
    minioStore.updateThumbnailSize(size.value)
  } else {
    minioStore.updateWatermarkSettings({
      size: size.value,
      ratio: safeRatio.value,
      opacity: safeOpacity.value,
      position: safePosition.value,
      image: watermarkPreview.value
    })
  }

  emit('update:show', false)
}
</script>
