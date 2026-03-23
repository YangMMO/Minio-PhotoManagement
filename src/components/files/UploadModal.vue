<template>
  <Modal
    :show="show"
    :title="t('uploadImage')"
    size="lg"
    :close-on-click-overlay="false"
    @update:show="emit('update:show', $event)"
  >
    <div v-if="uploading" class="py-8 text-center">
      <i class="ri-loader-4-line mb-4 inline-block text-4xl text-primary animate-spin"></i>
      <p class="text-gray-600">{{ t('Uploading') }} ({{ uploadedCount }} / {{ totalCount }})</p>
    </div>

    <div v-else-if="!uploadComplete">
      <div
        class="drop-area"
        :class="{ dragover: isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <i class="ri-upload-cloud-2-line mb-2 text-4xl"></i>
        <p>{{ t('DragPictures') }}</p>
      </div>

      <div class="my-4 text-center text-gray-400">{{ t('or') }}</div>

      <div class="text-center">
        <input
          ref="fileInputRef"
          type="file"
          webkitdirectory
          multiple
          class="hidden"
          @change="handleFileSelect"
        />
        <button class="btn btn-secondary" type="button" @click="openFolderPicker">
          <i class="ri-folder-line"></i>
          {{ t('SelectFolder') }}
        </button>
        <p class="mt-2 text-sm text-gray-600">
          <template v-if="selectedFiles.length > 0">
            {{ t('SelectedFolder') }}: {{ folderName || t('NoFolders') }}, {{ t('Quantity') }}: {{ selectedFiles.length }}
          </template>
          <template v-else>
            {{ t('NoFolders') }}
          </template>
        </p>
      </div>

      <p class="mt-4 text-center text-xs text-gray-500">{{ t('uploadTips') }}</p>
    </div>

    <div v-else class="py-8 text-center">
      <i class="ri-check-line mb-4 text-5xl text-green-500"></i>
      <p class="text-gray-600">{{ t('UploadCompleted') }}</p>
    </div>

    <template #footer>
      <template v-if="!uploading && !uploadComplete">
        <button class="btn btn-secondary" type="button" @click="handleCancel">{{ t('cancel') }}</button>
        <button class="btn btn-primary" type="button" @click="handleUpload" :disabled="selectedFiles.length === 0">
          {{ t('upload') }}
        </button>
      </template>
      <button v-else-if="uploadComplete" class="btn btn-primary" type="button" @click="handleComplete">
        {{ t('confirm') }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18nStore } from '../../stores/i18n'
import { useMinioStore } from '../../stores/minio'
import { useToast } from '../../composables/useToast'
import Modal from '../common/Modal.vue'

const i18nStore = useI18nStore()
const minioStore = useMinioStore()
const toast = useToast()
const t = (key) => i18nStore.t(key)

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  bucket: {
    type: String,
    required: true
  },
  prefix: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:show', 'uploaded'])

const fileInputRef = ref(null)
const isDragging = ref(false)
const selectedFiles = ref([])
const folderName = ref('')
const uploading = ref(false)
const uploadComplete = ref(false)
const uploadedCount = ref(0)
const totalCount = ref(0)

watch(() => props.show, (visible) => {
  if (!visible) {
    return
  }

  selectedFiles.value = []
  folderName.value = ''
  uploading.value = false
  uploadComplete.value = false
  uploadedCount.value = 0
  totalCount.value = 0
  isDragging.value = false

  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
})

function openFolderPicker() {
  fileInputRef.value?.click()
}

async function traverseFileTree(item, currentPath = '') {
  return new Promise((resolve) => {
    if (item.isFile) {
      item.file((file) => {
        file.relativePath = currentPath + file.name
        resolve([file])
      })
      return
    }

    if (!item.isDirectory) {
      resolve([])
      return
    }

    const reader = item.createReader()
    const files = []
    const readEntries = () => {
      reader.readEntries(async (entries) => {
        if (!entries.length) {
          resolve(files)
          return
        }

        for (const entry of entries) {
          const nestedFiles = await traverseFileTree(entry, currentPath + item.name + '/')
          files.push(...nestedFiles)
        }

        readEntries()
      })
    }

    readEntries()
  })
}

async function handleDrop(event) {
  isDragging.value = false
  const files = []

  for (const item of event.dataTransfer.items) {
    const entry = item.webkitGetAsEntry?.()
    if (!entry) {
      continue
    }

    const nestedFiles = await traverseFileTree(entry)
    files.push(...nestedFiles)
  }

  filterImageFiles(files)
}

function handleFileSelect(event) {
  const files = Array.from(event.target.files || [])
  filterImageFiles(files)

  if (files.length > 0) {
    folderName.value = files[0].webkitRelativePath?.split('/')[0] || ''
  }
}

function filterImageFiles(files) {
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  selectedFiles.value = files.filter((file) => {
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    return extensions.includes(extension)
  })

  if (selectedFiles.value.length > 0 && !folderName.value) {
    folderName.value = selectedFiles.value[0].webkitRelativePath?.split('/')[0] || ''
  }

  toast.info(`${t('selected')}: ${selectedFiles.value.length}`)
}

function fileToUint8Array(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Uint8Array(reader.result))
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

async function createThumbnail(buffer, maxSize) {
  const result = await window.electronAPI.image.createThumbnail(buffer, maxSize)
  if (!result.success) {
    throw new Error(result.error || 'Create thumbnail failed')
  }

  return result.buffer
}

async function createWatermark(buffer, options) {
  const result = await window.electronAPI.image.createWatermark(buffer, options)
  if (!result.success) {
    throw new Error(result.error || 'Create watermark failed')
  }

  return result.buffer
}

async function handleUpload() {
  if (selectedFiles.value.length === 0) {
    toast.warning(t('PleaseSelect'))
    return
  }

  uploading.value = true
  totalCount.value = selectedFiles.value.length
  uploadedCount.value = 0

  for (const file of selectedFiles.value) {
    try {
      const buffer = await fileToUint8Array(file)
      const mimeType = getMimeType(file.name)

      await window.electronAPI.minio.putObject(
        props.bucket,
        props.prefix + file.name,
        buffer,
        { 'content-type': mimeType }
      )

      const thumbBuffer = await createThumbnail(buffer, minioStore.thumbnailSize)
      const thumbPrefix = props.prefix.replace(/original\/?$/, 'thumb/')
      await window.electronAPI.minio.putObject(
        props.bucket,
        thumbPrefix + file.name,
        thumbBuffer,
        { 'content-type': mimeType }
      )

      if (minioStore.watermarkImage) {
        try {
          const watermarkBuffer = await createWatermark(buffer, {
            maxSize: minioStore.watermarkSize,
            watermarkImage: minioStore.watermarkImage,
            ratio: minioStore.watermarkRatio,
            opacity: minioStore.watermarkOpacity,
            position: minioStore.watermarkPosition
          })
          const watermarkPrefix = props.prefix.replace(/original\/?$/, 'watermark/')
          await window.electronAPI.minio.putObject(
            props.bucket,
            watermarkPrefix + file.name,
            watermarkBuffer,
            { 'content-type': mimeType }
          )
        } catch (error) {
          console.warn('Watermark creation failed:', error)
        }
      }

      uploadedCount.value += 1
    } catch (error) {
      console.error('Upload failed:', error)
      toast.error(`${t('UploadFailed')}: ${file.name}`)
    }
  }

  uploading.value = false
  uploadComplete.value = true
  emit('uploaded')
}

function getMimeType(filename) {
  const extension = filename.toLowerCase().split('.').pop()
  const mimeTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    webp: 'image/webp'
  }

  return mimeTypes[extension] || 'application/octet-stream'
}

function handleCancel() {
  emit('update:show', false)
}

function handleComplete() {
  emit('update:show', false)
}
</script>
