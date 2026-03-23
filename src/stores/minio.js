import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useMinioStore = defineStore('minio', () => {
  const currentBucket = ref(null)
  const currentPrefix = ref('')
  const buckets = ref([])
  const objects = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const selectedImages = ref(new Set())

  const thumbnailSize = ref(parseInt(localStorage.getItem('thumbnailMaxSize') || '480', 10))
  const watermarkSize = ref(parseInt(localStorage.getItem('watermarkMaxSize') || '1200', 10))
  const watermarkRatio = ref(parseInt(localStorage.getItem('percentage') || '4', 10))
  const watermarkOpacity = ref(parseInt(localStorage.getItem('transparency') || '80', 10))
  const watermarkPosition = ref(localStorage.getItem('watermarkPosition') || 'top-left')
  const watermarkImage = ref(localStorage.getItem('watermarkImage') || null)

  async function fetchBuckets() {
    isLoading.value = true
    error.value = null

    try {
      const result = await window.electronAPI.minio.listBuckets()
      if (result.success) {
        buckets.value = result.buckets.map((bucket) => ({
          name: bucket.name,
          creationDate: new Date(bucket.creationDate)
        }))
        return { success: true }
      }

      error.value = result.error
      return { success: false, error: result.error }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchObjects(bucket, prefix, recursive = false) {
    isLoading.value = true
    error.value = null

    try {
      const result = await window.electronAPI.minio.listObjects(bucket, prefix, recursive)
      if (result.success) {
        objects.value = result.objects.map((object) => ({
          name: object.name,
          prefix: object.prefix,
          size: object.size,
          lastModified: new Date(object.lastModified)
        }))
        return { success: true }
      }

      error.value = result.error
      return { success: false, error: result.error }
    } catch (err) {
      error.value = err.message
      return { success: false, error: err.message }
    } finally {
      isLoading.value = false
    }
  }

  async function uploadObject(bucket, name, buffer, metaData = {}) {
    try {
      return await window.electronAPI.minio.putObject(bucket, name, buffer, metaData)
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async function deleteObjects(bucket, objectNames) {
    try {
      return await window.electronAPI.minio.removeObjects(bucket, objectNames)
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async function statObject(bucket, name) {
    try {
      return await window.electronAPI.minio.statObject(bucket, name)
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  function setCurrentBucket(bucket) {
    currentBucket.value = bucket
    currentPrefix.value = ''
    selectedImages.value.clear()
  }

  function setCurrentPrefix(prefix) {
    currentPrefix.value = prefix
    selectedImages.value.clear()
  }

  function updateThumbnailSize(size) {
    thumbnailSize.value = size
    localStorage.setItem('thumbnailMaxSize', String(size))
  }

  function updateWatermarkSettings(settings) {
    if (settings.size !== undefined) {
      watermarkSize.value = settings.size
      localStorage.setItem('watermarkMaxSize', String(settings.size))
    }
    if (settings.ratio !== undefined) {
      watermarkRatio.value = settings.ratio
      localStorage.setItem('percentage', String(settings.ratio))
    }
    if (settings.opacity !== undefined) {
      watermarkOpacity.value = settings.opacity
      localStorage.setItem('transparency', String(settings.opacity))
    }
    if (settings.position !== undefined) {
      watermarkPosition.value = settings.position
      localStorage.setItem('watermarkPosition', settings.position)
    }
    if (settings.image !== undefined) {
      watermarkImage.value = settings.image
      if (settings.image) {
        localStorage.setItem('watermarkImage', settings.image)
      } else {
        localStorage.removeItem('watermarkImage')
      }
    }
  }

  return {
    currentBucket,
    currentPrefix,
    buckets,
    objects,
    isLoading,
    error,
    selectedImages,
    thumbnailSize,
    watermarkSize,
    watermarkRatio,
    watermarkOpacity,
    watermarkPosition,
    watermarkImage,
    fetchBuckets,
    fetchObjects,
    uploadObject,
    deleteObjects,
    statObject,
    setCurrentBucket,
    setCurrentPrefix,
    updateThumbnailSize,
    updateWatermarkSettings
  }
})
