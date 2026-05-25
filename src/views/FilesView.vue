<template>
  <div class="app-shell flex h-screen w-screen flex-col">
    <AppHeader />

    <main class="page-shell flex flex-1 overflow-hidden pt-14">
      <div class="workspace-shell flex-1">
        <aside
          class="workspace-sidebar max-w-[560px] min-w-[220px]"
          :style="{ width: `${sidebarWidth}px` }"
        >
          <div class="workspace-header">
            <div class="flex min-w-0 items-center gap-2">
              <button type="button" class="icon-button" :title="t('back')" @click="handleBack">
                <i class="ri-arrow-left-line text-base"></i>
              </button>
              <span class="truncate text-sm font-semibold text-title">{{ bucketName }}</span>
            </div>
            <div class="flex items-center gap-1">
              <button type="button" class="icon-button" :title="t('refresh')" @click="refreshTree">
                <i class="ri-refresh-line text-base"></i>
              </button>
              <button type="button" class="icon-button" :title="t('createFolder')" @click="openCreateFolderModal('')">
                <i class="ri-add-large-line text-base"></i>
              </button>
            </div>
          </div>

          <div class="folder-tree flex-1 overflow-y-auto">
            <FolderTree
              :nodes="treeData"
              :active-path="currentPath"
              :expanded-paths="expandedPaths"
              :context-path="contextMenuTargetPath"
              @select="handleFolderSelect"
              @toggle="toggleExpanded"
              @context-menu="openContextMenu"
            />
          </div>
        </aside>

        <div class="relative h-full w-0">
          <div class="resizer" @mousedown="startResize"></div>
        </div>

        <div class="workspace-main">
          <div class="workspace-header">
            <div class="truncate text-sm font-semibold text-title">
              {{ displayPath || t('selectFolder') }}
            </div>
            <div class="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                class="setting-chip"
                @click="openWatermarkSettings"
              >
                <span>{{ t('WatermarkSize') }}</span>
                <span class="font-medium text-primary">{{ watermarkSize }}px</span>
                <i class="ri-edit-line"></i>
              </button>
              <button
                type="button"
                class="setting-chip"
                @click="openThumbnailSettings"
              >
                <span>{{ t('ThumbnailSize') }}</span>
                <span class="font-medium text-primary">{{ thumbnailSize }}px</span>
                <i class="ri-edit-line"></i>
              </button>
            </div>
          </div>

          <div v-if="showToolbar" class="workspace-subheader">
            <div class="flex flex-wrap items-center gap-3">
              <button type="button" class="btn btn-primary text-sm" @click="openUploadModal">
                <i class="ri-folder-upload-fill"></i>
                {{ t('uploadImage') }}
              </button>
              <button type="button" class="btn btn-danger text-sm" @click="handleDeleteSelected" :disabled="selectedCount === 0">
                <i class="ri-delete-bin-fill"></i>
                {{ t('delete') }}
              </button>
              <label class="inline-chip">
                <input v-model="selectAll" type="checkbox" @change="handleSelectAll" />
                {{ t('selected') }}: {{ selectedCount }}
              </label>
            </div>
            <div class="flex flex-wrap items-center justify-end gap-4 text-sm text-subtle">
              <label class="flex items-center gap-1">
                <input v-model="showFileName" type="checkbox" />
                {{ t('showFileName') }}
              </label>
              <label class="flex items-center gap-1">
                <input v-model="showDate" type="checkbox" />
                {{ t('showDate') }}
              </label>
              <button type="button" class="inline-flex items-center gap-1 transition-colors hover:text-primary" @click="toggleSort">
                <i :class="sortAsc ? 'ri-sort-asc' : 'ri-sort-desc'"></i>
                {{ t('sortTime') }}
              </button>
              <span class="text-quiet">{{ t('imageCount') }}: {{ imageCount }}</span>
            </div>
          </div>

          <div ref="contentBodyRef" class="workspace-body" @mousedown="beginBoxSelection">
            <ImageGrid
              v-if="images.length > 0"
              :images="sortedImages"
              :show-file-name="showFileName"
              :show-date="showDate"
              :selected="selectedImages"
              @select="toggleImageSelection"
              @preview="openImagePreview"
            />
            <div v-else class="empty-state h-full">
              <i class="ri-image-line mb-4 text-5xl"></i>
              <p>{{ currentPath ? t('currentDirectoryNull') : t('selectFolder') }}</p>
            </div>
          </div>

          <div class="workspace-footer">
            {{ t('supportTip') }}
          </div>
        </div>
      </div>
    </main>

    <UploadModal
      :show="uploadModalVisible"
      :bucket="bucketName"
      :prefix="uploadPrefix"
      @update:show="uploadModalVisible = $event"
      @uploaded="handleUploaded"
    />

    <SettingsModal
      :show="settingsModalVisible"
      :type="settingsType"
      @update:show="settingsModalVisible = $event"
    />

    <ImagePreview
      :show="previewVisible"
      :image="previewImage"
      :bucket="bucketName"
      :images="sortedImages"
      :prefix="currentPath"
      @update:show="previewVisible = $event"
      @navigate="handlePreviewNavigate"
    />

    <Modal
      :show="createFolderModalVisible"
      :title="t('createFolder')"
      :close-on-click-overlay="false"
      @update:show="createFolderModalVisible = $event"
    >
      <div class="space-y-4">
        <input
          v-model="newFolderName"
          type="text"
          class="input"
          :placeholder="t('enterFolderName')"
          @keyup.enter="confirmCreateFolder"
        />
        <div class="flex gap-2">
          <span
            class="inline-chip cursor-pointer"
            @click="insertCurrentDate"
          >
            {{ t('currentDate') }}
          </span>
        </div>
      </div>
      <template #footer>
        <button type="button" class="btn btn-secondary" @click="createFolderModalVisible = false">{{ t('cancel') }}</button>
        <button type="button" class="btn btn-primary" @click="confirmCreateFolder">{{ t('create') }}</button>
      </template>
    </Modal>

    <Modal
      :show="confirmVisible"
      :title="t('confirm')"
      :close-on-click-overlay="false"
      @update:show="handleConfirmVisibility"
    >
      <p class="text-sm text-subtle">{{ confirmMessage }}</p>
      <template #footer>
        <button type="button" class="btn btn-secondary" @click="resolveConfirm(false)">{{ t('cancel') }}</button>
        <button type="button" class="btn btn-primary" @click="resolveConfirm(true)">{{ t('confirm') }}</button>
      </template>
    </Modal>

    <ContextMenu
      v-if="contextMenuVisible"
      :position="contextMenuPosition"
      @create="handleContextCreate"
      @delete="handleContextDelete"
      @close="closeContextMenu"
    />

    <div
      v-if="selectionBox.visible"
      class="pointer-events-none fixed z-[1000] border border-dashed border-primary bg-primary/20"
      :style="selectionStyle"
    ></div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMinioStore } from '../stores/minio'
import { useAuthStore } from '../stores/auth'
import { useI18nStore } from '../stores/i18n'
import { useToast } from '../composables/useToast'
import AppHeader from '../components/common/AppHeader.vue'
import Modal from '../components/common/Modal.vue'
import FolderTree from '../components/files/FolderTree.vue'
import ImageGrid from '../components/files/ImageGrid.vue'
import UploadModal from '../components/files/UploadModal.vue'
import SettingsModal from '../components/files/SettingsModal.vue'
import ImagePreview from '../components/files/ImagePreview.vue'
import ContextMenu from '../components/files/ContextMenu.vue'

const route = useRoute()
const router = useRouter()
const minioStore = useMinioStore()
const authStore = useAuthStore()
const i18nStore = useI18nStore()
const toast = useToast()
const t = (key) => i18nStore.t(key)

const bucketName = computed(() => String(route.params.bucket || ''))
const contentBodyRef = ref(null)

const sidebarWidth = ref(260)
const treeData = ref([])
const currentPath = ref('')
const expandedPaths = ref(new Set())
const images = ref([])
const selectedImages = ref(new Set())
const showFileName = ref(true)
const showDate = ref(true)
const sortAsc = ref(true)
const selectAll = ref(false)

const uploadModalVisible = ref(false)
const settingsModalVisible = ref(false)
const settingsType = ref('thumbnail')
const previewVisible = ref(false)
const previewImage = ref(null)
const createFolderModalVisible = ref(false)
const createFolderBasePath = ref('')
const newFolderName = ref('')

const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const contextMenuTargetPath = ref('')

const confirmVisible = ref(false)
const confirmMessage = ref('')
let confirmResolver = null

const selectionBox = ref({
  visible: false,
  left: 0,
  top: 0,
  width: 0,
  height: 0
})

const thumbnailSize = computed(() => minioStore.thumbnailSize)
const watermarkSize = computed(() => minioStore.watermarkSize)
const showToolbar = computed(() => currentPath.value !== '')
const selectedCount = computed(() => selectedImages.value.size)
const imageCount = computed(() => images.value.length)
const displayPath = computed(() => (currentPath.value ? `${ensureTrailingSlash(currentPath.value)}thumb/` : ''))
const uploadPrefix = computed(() => (currentPath.value ? `${ensureTrailingSlash(currentPath.value)}original/` : ''))

const sortedImages = computed(() => {
  const sorted = [...images.value]
  sorted.sort((left, right) => {
    const leftTime = new Date(left.lastModified).getTime()
    const rightTime = new Date(right.lastModified).getTime()
    return sortAsc.value ? leftTime - rightTime : rightTime - leftTime
  })
  return sorted
})

const selectionStyle = computed(() => ({
  left: `${selectionBox.value.left}px`,
  top: `${selectionBox.value.top}px`,
  width: `${selectionBox.value.width}px`,
  height: `${selectionBox.value.height}px`
}))

let isResizing = false
let isSelecting = false
let selectionStart = { x: 0, y: 0 }
let processedSelectionNames = new Set()

function ensureTrailingSlash(path) {
  if (!path) {
    return ''
  }

  return path.endsWith('/') ? path : `${path}/`
}

function containsSpecialDirectory(path) {
  const parts = path.split('/').filter(Boolean)
  return parts.includes('thumb') || parts.includes('original') || parts.includes('watermark')
}

function setSelectedNames(names) {
  selectedImages.value = new Set(names)
  updateSelectAllState()
}

function updateSelectAllState() {
  selectAll.value = images.value.length > 0 && selectedImages.value.size === images.value.length
}

function setExpanded(path, expanded) {
  const nextExpanded = new Set(expandedPaths.value)
  if (expanded) {
    nextExpanded.add(path)
  } else {
    nextExpanded.delete(path)
  }
  expandedPaths.value = nextExpanded
}

function addExpandedPaths(paths) {
  const nextExpanded = new Set(expandedPaths.value)
  paths.forEach((path) => nextExpanded.add(path))
  expandedPaths.value = nextExpanded
}

function toggleExpanded(path) {
  setExpanded(path, !expandedPaths.value.has(path))
}

function buildObjectUrl(objectPath, version) {
  const protocol = authStore.useSSL ? 'https' : 'http'
  const encodedBucket = encodeURIComponent(bucketName.value)
  const encodedPath = objectPath
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/')

  const baseUrl = `${protocol}://${authStore.endPoint}:${authStore.port}/${encodedBucket}/${encodedPath}`
  return version ? `${baseUrl}?v=${encodeURIComponent(version)}` : baseUrl
}

function isImageFile(name) {
  const lowerName = name.toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].some((extension) => lowerName.endsWith(extension))
}

function buildFolderTree(objects) {
  const tree = {}
  const dirTimes = {}
  const allDirs = new Set()
  const addedPaths = new Set()

  objects.forEach((object) => {
    const name = object.name || ''
    if (!name) {
      return
    }

    const parts = name.split('/').filter(Boolean)
    const isDirectory = name.endsWith('/')
    const dirPartCount = isDirectory ? parts.length : Math.max(parts.length - 1, 0)
    let currentDirPath = ''

    for (let index = 0; index < dirPartCount; index += 1) {
      currentDirPath += `${parts[index]}/`
      allDirs.add(currentDirPath)
    }

    if (name.endsWith('.keep')) {
      const dirPath = name.slice(0, -'.keep'.length)
      if (!containsSpecialDirectory(dirPath)) {
        dirTimes[dirPath] = object.lastModified ? new Date(object.lastModified) : null
      }
    }
  })

  objects.forEach((object) => {
    const name = object.name || ''
    if (!name || name.endsWith('.keep') || name.endsWith('/')) {
      return
    }

    const parts = name.split('/').filter(Boolean)
    if (parts.length <= 1 || parts.includes('thumb') || parts.includes('original') || parts.includes('watermark')) {
      return
    }

    let currentNode = tree
    for (let index = 0; index < parts.length - 1; index += 1) {
      const part = parts[index]
      const dirPath = `${parts.slice(0, index + 1).join('/')}/`

      if (!currentNode[part]) {
        currentNode[part] = {
          _children: {},
          _time: dirTimes[dirPath] || null
        }
      }

      addedPaths.add(dirPath)
      currentNode = currentNode[part]._children
    }
  })

  allDirs.forEach((dirPath) => {
    if (addedPaths.has(dirPath) || containsSpecialDirectory(dirPath)) {
      return
    }

    const parts = dirPath.split('/').filter(Boolean)
    let currentNode = tree

    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index]
      const fullPath = `${parts.slice(0, index + 1).join('/')}/`

      if (!currentNode[part]) {
        currentNode[part] = {
          _children: {},
          _time: dirTimes[fullPath] || null
        }
      }

      currentNode = currentNode[part]._children
    }
  })

  return convertTree(tree, '')
}

function convertTree(node, basePath) {
  return Object.keys(node)
    .map((name) => {
      const path = `${basePath}${name}/`
      const treeNode = node[name]
      return {
        name,
        path,
        lastModified: treeNode._time,
        children: convertTree(treeNode._children, path)
      }
    })
    .sort((left, right) => {
      const leftTime = left.lastModified ? new Date(left.lastModified).getTime() : 0
      const rightTime = right.lastModified ? new Date(right.lastModified).getTime() : 0

      if (leftTime !== rightTime) {
        return rightTime - leftTime
      }

      return left.name.localeCompare(right.name)
    })
}

function treeHasPath(nodes, path) {
  return nodes.some((node) => node.path === path || treeHasPath(node.children, path))
}

function getAllParentPaths(path) {
  const parts = path.split('/').filter(Boolean)
  const paths = []
  for (let index = 0; index < parts.length; index += 1) {
    paths.push(`${parts.slice(0, index + 1).join('/')}/`)
  }
  return paths
}

function getParentPath(path) {
  const parts = path.split('/').filter(Boolean)
  if (parts.length <= 1) {
    return ''
  }

  return `${parts.slice(0, parts.length - 1).join('/')}/`
}

async function loadTreeData() {
  if (!bucketName.value) {
    treeData.value = []
    return
  }

  const result = await window.electronAPI.minio.listObjects(bucketName.value, '', true)
  if (!result.success) {
    toast.error(t('loadTreeFailed'))
    return
  }

  treeData.value = buildFolderTree(result.objects)

  if (currentPath.value && !treeHasPath(treeData.value, currentPath.value)) {
    currentPath.value = ''
    images.value = []
    setSelectedNames([])
  }
}

async function loadImages(path) {
  images.value = []
  setSelectedNames([])

  if (!path) {
    return
  }

  const thumbPath = `${ensureTrailingSlash(path)}thumb/`
  const result = await window.electronAPI.minio.listObjects(bucketName.value, thumbPath, false)
  if (!result.success) {
    console.error('Load images error:', result.error)
    return
  }

  const seen = new Set()
  images.value = result.objects
    .filter((object) => {
      const name = object.name || ''
      if (!name || name.endsWith('/.keep') || name.endsWith('/')) {
        return false
      }

      const fileName = name.slice(thumbPath.length)
      if (!fileName || fileName.includes('/') || !isImageFile(fileName) || seen.has(fileName)) {
        return false
      }

      seen.add(fileName)
      return true
    })
    .map((object) => {
      const fileName = object.name.slice(thumbPath.length)
      return {
        name: fileName,
        path: object.name,
        lastModified: object.lastModified,
        size: object.size,
        url: buildObjectUrl(object.name, object.lastModified)
      }
    })
}

async function handleFolderSelect(path) {
  currentPath.value = ensureTrailingSlash(path)
  addExpandedPaths(getAllParentPaths(currentPath.value))
  await loadImages(currentPath.value)
}

async function checkFolderExists(path) {
  const result = await window.electronAPI.minio.listObjects(bucketName.value, ensureTrailingSlash(path), true)
  return Boolean(result.success && result.objects.length > 0)
}

function handleBack() {
  router.push({ name: 'Buckets' })
}

function startResize() {
  isResizing = true
}

function beginBoxSelection(event) {
  if (event.button !== 0 || images.value.length === 0 || event.target.closest('.image-card')) {
    return
  }

  isSelecting = true
  processedSelectionNames = new Set()
  selectionStart = { x: event.clientX, y: event.clientY }
  selectionBox.value = {
    visible: true,
    left: event.clientX,
    top: event.clientY,
    width: 0,
    height: 0
  }
  event.preventDefault()
}

function toggleImageSelection(imageName) {
  const nextSelected = new Set(selectedImages.value)
  if (nextSelected.has(imageName)) {
    nextSelected.delete(imageName)
  } else {
    nextSelected.add(imageName)
  }
  selectedImages.value = nextSelected
  updateSelectAllState()
}

function handleSelectAll() {
  if (selectAll.value) {
    setSelectedNames(images.value.map((image) => image.name))
    return
  }

  setSelectedNames([])
}

function toggleSort() {
  sortAsc.value = !sortAsc.value
}

async function refreshTree(showSuccessToast = true) {
  try {
    await loadTreeData()
    if (currentPath.value) {
      await loadImages(currentPath.value)
    }
    if (showSuccessToast) {
      toast.success(t('refreshSuccess'))
    }
  } catch (error) {
    console.error('Refresh failed:', error)
    toast.error(t('manualRefreshFailed'))
  }
}

function openUploadModal() {
  if (!currentPath.value) {
    return
  }

  uploadModalVisible.value = true
}

function openThumbnailSettings() {
  settingsType.value = 'thumbnail'
  settingsModalVisible.value = true
}

function openWatermarkSettings() {
  settingsType.value = 'watermark'
  settingsModalVisible.value = true
}

function openImagePreview(image) {
  previewImage.value = image
  previewVisible.value = true
}

function handlePreviewNavigate(image) {
  previewImage.value = image
}

function openCreateFolderModal(basePath) {
  createFolderBasePath.value = basePath ? ensureTrailingSlash(basePath) : ''
  newFolderName.value = ''
  createFolderModalVisible.value = true
  closeContextMenu()
}

function insertCurrentDate() {
  const now = new Date()
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  newFolderName.value += date
}

function openConfirm(message) {
  confirmMessage.value = message
  confirmVisible.value = true
  return new Promise((resolve) => {
    confirmResolver = resolve
  })
}

function resolveConfirm(result) {
  const resolver = confirmResolver
  confirmResolver = null
  confirmVisible.value = false
  if (resolver) {
    resolver(result)
  }
}

function handleConfirmVisibility(visible) {
  if (!visible && confirmVisible.value) {
    resolveConfirm(false)
    return
  }

  confirmVisible.value = visible
}

async function confirmCreateFolder() {
  const folderName = newFolderName.value.trim()
  if (!folderName) {
    toast.warning(t('enterFolderName'))
    return
  }

  const folderPath = `${createFolderBasePath.value}${folderName}/`
  if (await checkFolderExists(folderPath)) {
    toast.warning(t('folderExists'))
    return
  }

  const result = await window.electronAPI.minio.putObject(
    bucketName.value,
    `${folderPath}.keep`,
    new Uint8Array(),
    {}
  )

  if (!result.success) {
    toast.error(result.error || t('failed'))
    return
  }

  addExpandedPaths(getAllParentPaths(folderPath))
  createFolderModalVisible.value = false
  await loadTreeData()
  await handleFolderSelect(folderPath)
  toast.success(t('folderCreated'))
}

async function handleDeleteFolder(path) {
  if (!path) {
    return
  }

  const confirmed = await openConfirm(`${t('confirmDelete')} ${path}`)
  if (!confirmed) {
    return
  }

  const result = await window.electronAPI.minio.listObjects(bucketName.value, ensureTrailingSlash(path), true)
  if (!result.success) {
    toast.error(t('deleteFailed'))
    return
  }

  const objectNames = result.objects.map((object) => object.name).filter(Boolean)
  if (objectNames.length === 0) {
    toast.info(t('directoryEmpty'))
    return
  }

  const removeResult = await window.electronAPI.minio.removeObjects(bucketName.value, objectNames)
  if (!removeResult.success) {
    toast.error(t('deleteFailed'))
    return
  }

  const parentPath = getParentPath(path)
  await loadTreeData()

  if (parentPath) {
    currentPath.value = parentPath
    addExpandedPaths(getAllParentPaths(parentPath))
    await loadImages(parentPath)
  } else if (treeData.value.length > 0) {
    await handleFolderSelect(treeData.value[0].path)
  } else {
    currentPath.value = ''
    images.value = []
    setSelectedNames([])
  }

  toast.success(t('deleteSuccess'))
}

function openContextMenu({ event, path }) {
  contextMenuTargetPath.value = path
  contextMenuPosition.value = {
    x: event.clientX,
    y: event.clientY
  }
  contextMenuVisible.value = true
}

function closeContextMenu() {
  contextMenuVisible.value = false
  contextMenuTargetPath.value = ''
}

function handleContextCreate() {
  openCreateFolderModal(contextMenuTargetPath.value)
}

async function handleContextDelete() {
  const targetPath = contextMenuTargetPath.value
  closeContextMenu()
  await handleDeleteFolder(targetPath)
}

async function handleDeleteSelected() {
  if (selectedImages.value.size === 0 || !currentPath.value) {
    toast.warning(t('PleaseSelectPictureFirst'))
    return
  }

  const confirmed = await openConfirm(`${t('confirmDelete')} ${selectedImages.value.size}`)
  if (!confirmed) {
    return
  }

  const basePath = ensureTrailingSlash(currentPath.value)
  const objectNames = []
  selectedImages.value.forEach((name) => {
    objectNames.push(`${basePath}thumb/${name}`)
    objectNames.push(`${basePath}original/${name}`)
    objectNames.push(`${basePath}watermark/${name}`)
  })

  const result = await window.electronAPI.minio.removeObjects(bucketName.value, objectNames)
  if (!result.success) {
    toast.error(t('deleteFailed'))
    return
  }

  await loadImages(currentPath.value)
  toast.success(t('deleteSuccess'))
}

async function handleUploaded() {
  await loadTreeData()
  await loadImages(currentPath.value)
}

function handleGlobalMouseMove(event) {
  if (isResizing) {
    sidebarWidth.value = Math.min(600, Math.max(200, event.clientX))
  }

  if (!isSelecting || !contentBodyRef.value) {
    return
  }

  const containerRect = contentBodyRef.value.getBoundingClientRect()
  const currentX = Math.min(Math.max(event.clientX, containerRect.left), containerRect.right)
  const currentY = Math.min(Math.max(event.clientY, containerRect.top), containerRect.bottom)
  const left = Math.min(currentX, selectionStart.x)
  const top = Math.min(currentY, selectionStart.y)
  const width = Math.abs(currentX - selectionStart.x)
  const height = Math.abs(currentY - selectionStart.y)

  selectionBox.value = {
    visible: true,
    left,
    top,
    width,
    height
  }

  const selectionRect = {
    left,
    top,
    right: left + width,
    bottom: top + height
  }

  contentBodyRef.value.querySelectorAll('[data-image-name]').forEach((element) => {
    const name = element.getAttribute('data-image-name')
    if (!name || processedSelectionNames.has(name)) {
      return
    }

    const rect = element.getBoundingClientRect()
    const intersects = !(rect.right < selectionRect.left || rect.left > selectionRect.right || rect.bottom < selectionRect.top || rect.top > selectionRect.bottom)

    if (intersects) {
      processedSelectionNames.add(name)
      toggleImageSelection(name)
    }
  })
}

function handleGlobalMouseUp() {
  if (isResizing) {
    isResizing = false
    localStorage.setItem('sidebarWidth', String(Math.round(sidebarWidth.value)))
  }

  if (isSelecting) {
    isSelecting = false
    processedSelectionNames = new Set()
    selectionBox.value = {
      visible: false,
      left: 0,
      top: 0,
      width: 0,
      height: 0
    }
    updateSelectAllState()
  }
}

function handleDocumentClick(event) {
  if (contextMenuVisible.value && !event.target.closest('.context-menu')) {
    closeContextMenu()
  }
}

async function initializeBucket() {
  currentPath.value = ''
  previewVisible.value = false
  previewImage.value = null
  closeContextMenu()
  setSelectedNames([])
  minioStore.setCurrentBucket(bucketName.value)

  if (!bucketName.value) {
    treeData.value = []
    images.value = []
    return
  }

  await loadTreeData()
}

watch(() => bucketName.value, initializeBucket, { immediate: true })

onMounted(() => {
  const savedWidth = localStorage.getItem('sidebarWidth')
  if (savedWidth) {
    const parsedWidth = Number.parseInt(savedWidth, 10)
    if (!Number.isNaN(parsedWidth) && parsedWidth >= 200 && parsedWidth <= 600) {
      sidebarWidth.value = parsedWidth
    }
  }

  document.addEventListener('mousemove', handleGlobalMouseMove)
  document.addEventListener('mouseup', handleGlobalMouseUp)
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleGlobalMouseMove)
  document.removeEventListener('mouseup', handleGlobalMouseUp)
  document.removeEventListener('click', handleDocumentClick)
  localStorage.setItem('sidebarWidth', String(Math.round(sidebarWidth.value)))
})
</script>
