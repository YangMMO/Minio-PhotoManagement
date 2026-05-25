const { app, BrowserWindow, Menu, dialog, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const Minio = require('minio')
const sharp = require('sharp')
const { XMLParser } = require('fast-xml-parser')
const minioPackagePath = require.resolve('minio/package.json')
const minioHelper = require(path.join(path.dirname(minioPackagePath), 'dist', 'main', 'internal', 'helper.js'))

let mainWindow = null
let minioClient = null
let currentLanguage = 'zh'
let currentTheme = 'light'
let configStore = {}

const relaxedMinioXmlParser = new XMLParser({
  numberParseOptions: {
    eNotation: false,
    hex: true,
    leadingZeros: true
  },
  processEntities: {
    maxTotalExpansions: 200000,
    maxEntityCount: 200000,
    maxExpandedLength: 20 * 1024 * 1024
  }
})

minioHelper.parseXml = function parseXmlWithHigherEntityLimit(xml) {
  const result = relaxedMinioXmlParser.parse(xml)
  if (result?.Error) {
    throw result.Error
  }

  return result
}

const configPath = () => path.join(app.getPath('userData'), 'config.json')

function loadConfigStore() {
  try {
    if (fs.existsSync(configPath())) {
      configStore = JSON.parse(fs.readFileSync(configPath(), 'utf8'))
    } else {
      configStore = {}
    }
  } catch (error) {
    console.error('Failed to load config:', error)
    configStore = {}
  }

  currentTheme = configStore.settings?.theme === 'dark' ? 'dark' : 'light'
  initMinioClientFromConfig()
}

function saveConfigStore() {
  try {
    fs.writeFileSync(configPath(), JSON.stringify(configStore, null, 2))
  } catch (error) {
    console.error('Failed to save config:', error)
    throw error
  }
}

function createMinioClient(config) {
  return new Minio.Client({
    endPoint: config.endPoint,
    port: Number(config.port) || 9000,
    useSSL: Boolean(config.useSSL),
    accessKey: config.accessKey,
    secretKey: config.secretKey
  })
}

function initMinioClientFromConfig() {
  const config = configStore.minioConfig
  if (!config?.endPoint || !config?.accessKey || !config?.secretKey) {
    minioClient = null
    return
  }

  try {
    minioClient = createMinioClient(config)
  } catch (error) {
    console.error('Failed to initialize MinIO client from config:', error)
    minioClient = null
  }
}

function getMenuText(lang) {
  const text = {
    zh: {
      app: app.name,
      about: '关于',
      quit: '退出',
      action: '操作',
      reload: '重新载入',
      devtools: '开发者工具',
      fullscreen: '全屏',
      setting: '设置',
      theme: '主题',
      lightTheme: '明亮模式',
      darkTheme: '黑暗模式',
      langSwitch: '切换至 English',
      aboutMsg: 'MinIO 图片管理系统\n© 2025 MMOO.FUN, All rights reserved.',
      ok: '确定'
    },
    en: {
      app: 'Client',
      about: 'About',
      quit: 'Quit',
      action: 'Actions',
      reload: 'Reload',
      devtools: 'Dev Tools',
      fullscreen: 'Fullscreen',
      setting: 'Settings',
      theme: 'Theme',
      lightTheme: 'Light Mode',
      darkTheme: 'Dark Mode',
      langSwitch: 'Switch to 中文',
      aboutMsg: 'MinIO Image Manager\n© 2025 MMOO.FUN, All rights reserved.',
      ok: 'OK'
    }
  }

  return text[lang] || text.zh
}

function showAboutDialog(text) {
  dialog.showMessageBox({
    type: 'info',
    title: text.about,
    message: text.aboutMsg,
    buttons: [text.ok]
  })
}

function updateStoredTheme(theme) {
  if (!configStore.settings) {
    configStore.settings = {}
  }

  configStore.settings.theme = theme
  saveConfigStore()
}

function setCurrentTheme(theme, options = {}) {
  const { notifyRenderer = true, persist = true } = options

  if (theme !== 'light' && theme !== 'dark') {
    return
  }

  currentTheme = theme

  if (persist) {
    try {
      updateStoredTheme(theme)
    } catch (error) {
      console.error('Failed to persist theme:', error)
    }
  }

  if (notifyRenderer && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('menu:theme-change', currentTheme)
  }

  createMenu()
}

function createMenu() {
  if (!mainWindow) {
    return
  }

  const text = getMenuText(currentLanguage)

  const template = [
    {
      label: text.app,
      submenu: [
        {
          label: text.about,
          click: () => showAboutDialog(text)
        },
        { type: 'separator' },
        {
          label: text.quit,
          role: 'quit'
        }
      ]
    },
    {
      label: text.setting,
      submenu: [
        {
          label: text.langSwitch,
          accelerator: 'CmdOrCtrl+L',
          click: () => {
            currentLanguage = currentLanguage === 'zh' ? 'en' : 'zh'
            mainWindow.webContents.send('menu:language-change', currentLanguage)
            createMenu()
          }
        },
        { type: 'separator' },
        {
          label: text.lightTheme,
          type: 'radio',
          checked: currentTheme === 'light',
          click: () => setCurrentTheme('light')
        },
        {
          label: text.darkTheme,
          type: 'radio',
          checked: currentTheme === 'dark',
          click: () => setCurrentTheme('dark')
        }
      ]
    },
    {
      label: text.action,
      submenu: [
        {
          label: text.reload,
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.reload()
        },
        {
          label: text.devtools,
          accelerator: 'F12',
          click: () => mainWindow.webContents.toggleDevTools()
        },
        {
          label: text.fullscreen,
          accelerator: 'F11',
          click: () => {
            const isFullscreen = mainWindow.isFullScreen()
            mainWindow.setFullScreen(!isFullscreen)
          }
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 1000,
    minWidth: 960,
    minHeight: 720,
    show: false,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.NODE_ENV === 'development') {
    const port = process.env.VITE_PORT || '5173'
    mainWindow.loadURL(`http://localhost:${port}`)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../app/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    createMenu()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function ensureMinioClient() {
  if (!minioClient) {
    throw new Error('MinIO client not initialized')
  }

  return minioClient
}

function toBuffer(payload) {
  if (Buffer.isBuffer(payload)) {
    return payload
  }

  if (payload instanceof Uint8Array) {
    return Buffer.from(payload)
  }

  if (payload instanceof ArrayBuffer) {
    return Buffer.from(new Uint8Array(payload))
  }

  if (Array.isArray(payload)) {
    return Buffer.from(payload)
  }

  return Buffer.from(payload || [])
}

function dataUrlToBuffer(dataUrl) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl || '')
  if (!match) {
    return Buffer.from(dataUrl || '', 'base64')
  }

  return Buffer.from(match[2], 'base64')
}

async function listObjectsAsArray(bucket, prefix = '', recursive = false) {
  const client = ensureMinioClient()
  const stream = typeof client.listObjectsV2 === 'function'
    ? client.listObjectsV2(bucket, prefix, recursive)
    : client.listObjects(bucket, prefix, recursive)
  const objects = []

  for await (const item of stream) {
    objects.push(item)
  }

  return objects
}

async function removeObjects(bucket, objects) {
  const client = ensureMinioClient()
  const names = Array.isArray(objects) ? objects.filter(Boolean) : [objects].filter(Boolean)

  if (names.length === 0) {
    return
  }

  if (names.length === 1) {
    await client.removeObject(bucket, names[0])
    return
  }

  await client.removeObjects(bucket, names)
}

function encodeWatermarkOpacity(buffer, opacity) {
  return sharp(buffer)
    .ensureAlpha(Math.max(0.01, Math.min(1, opacity / 100)))
    .png()
    .toBuffer()
}

function getWatermarkPlacement(position, imageWidth, imageHeight, watermarkWidth, watermarkHeight) {
  const safeLeft = Math.max(0, imageWidth - watermarkWidth)
  const safeTop = Math.max(0, imageHeight - watermarkHeight)

  switch (position) {
    case 'top-right':
      return { left: safeLeft, top: 0 }
    case 'bottom-left':
      return { left: 0, top: safeTop }
    case 'bottom-right':
      return { left: safeLeft, top: safeTop }
    case 'center':
      return {
        left: Math.max(0, Math.round((imageWidth - watermarkWidth) / 2)),
        top: Math.max(0, Math.round((imageHeight - watermarkHeight) / 2))
      }
    case 'top-left':
    default:
      return { left: 0, top: 0 }
  }
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) {
      return
    }

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    mainWindow.focus()
  })
}

app.name = '客户端'

app.whenReady().then(() => {
  loadConfigStore()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('menu:set-language', async (_event, language) => {
  if (language === 'zh' || language === 'en') {
    currentLanguage = language
    createMenu()
  }

  return { success: true }
})

ipcMain.handle('menu:set-theme', async (_event, theme) => {
  if (theme === 'light' || theme === 'dark') {
    setCurrentTheme(theme, { notifyRenderer: false, persist: true })
  }

  return { success: true }
})

ipcMain.handle('minio:login', async (_event, config) => {
  try {
    const client = createMinioClient(config)
    await client.listBuckets()
    minioClient = client
    return { success: true }
  } catch (error) {
    console.error('MinIO login error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('minio:listBuckets', async () => {
  try {
    const buckets = await ensureMinioClient().listBuckets()
    return { success: true, buckets }
  } catch (error) {
    console.error('List buckets error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('minio:listObjects', async (_event, bucket, prefix = '', recursive = false) => {
  try {
    const objects = await listObjectsAsArray(bucket, prefix, recursive)
    return { success: true, objects }
  } catch (error) {
    console.error('List objects error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('minio:putObject', async (_event, bucket, name, payload, metaData = {}) => {
  try {
    const buffer = toBuffer(payload)
    await ensureMinioClient().putObject(bucket, name, buffer, buffer.length, metaData)
    return { success: true }
  } catch (error) {
    console.error('Put object error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('minio:removeObjects', async (_event, bucket, objects) => {
  try {
    await removeObjects(bucket, objects)
    return { success: true }
  } catch (error) {
    console.error('Remove objects error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('minio:removeObject', async (_event, bucket, objects) => {
  try {
    await removeObjects(bucket, objects)
    return { success: true }
  } catch (error) {
    console.error('Remove object error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('minio:statObject', async (_event, bucket, name) => {
  try {
    const stat = await ensureMinioClient().statObject(bucket, name)
    return { success: true, stat }
  } catch (error) {
    console.error('Stat object error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('config:get', async () => {
  try {
    return { success: true, data: configStore.minioConfig || null }
  } catch (error) {
    console.error('Get config error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('config:set', async (_event, data) => {
  try {
    configStore.minioConfig = data
    saveConfigStore()
    initMinioClientFromConfig()
    return { success: true }
  } catch (error) {
    console.error('Set config error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('config:clear', async () => {
  try {
    delete configStore.minioConfig
    saveConfigStore()
    minioClient = null
    return { success: true }
  } catch (error) {
    console.error('Clear config error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('settings:get', async (_event, key) => {
  try {
    return { success: true, value: configStore.settings?.[key] ?? null }
  } catch (error) {
    console.error('Get settings error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('settings:set', async (_event, key, value) => {
  try {
    if (!configStore.settings) {
      configStore.settings = {}
    }

    configStore.settings[key] = value
    saveConfigStore()
    return { success: true }
  } catch (error) {
    console.error('Set settings error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('settings:remove', async (_event, key) => {
  try {
    if (configStore.settings) {
      delete configStore.settings[key]
      saveConfigStore()
    }

    return { success: true }
  } catch (error) {
    console.error('Remove settings error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('system:getAppPath', async () => {
  return { success: true, path: app.getAppPath() }
})

ipcMain.handle('system:showOpenDialog', async (_event, options) => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, options)
    return { success: true, ...result }
  } catch (error) {
    console.error('Show open dialog error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('image:createThumbnail', async (_event, payload, maxSize) => {
  try {
    const thumbnail = await sharp(toBuffer(payload))
      .rotate()
      .resize(maxSize, maxSize, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer()

    return { success: true, buffer: thumbnail }
  } catch (error) {
    console.error('Create thumbnail error:', error)
    return { success: false, error: error.message }
  }
})

ipcMain.handle('image:createWatermark', async (_event, payload, options = {}) => {
  try {
    const { watermarkImage, maxSize, ratio = 4, opacity = 80, position = 'top-left' } = options
    if (!watermarkImage) {
      return { success: false, error: 'No watermark image provided' }
    }

    const baseImage = sharp(toBuffer(payload)).rotate()
    const metadata = await baseImage.metadata()
    const width = metadata.width || maxSize
    const height = metadata.height || maxSize

    const resizedImage = width > maxSize || height > maxSize
      ? await baseImage.resize(maxSize, maxSize, { fit: 'inside' }).toBuffer()
      : await baseImage.toBuffer()

    const resizedMetadata = await sharp(resizedImage).metadata()
    const watermarkWidth = Math.max(1, Math.floor((resizedMetadata.width || maxSize) / ratio))
    const rawWatermark = dataUrlToBuffer(watermarkImage)
    const resizedWatermark = await sharp(rawWatermark)
      .resize({ width: watermarkWidth, withoutEnlargement: true })
      .toBuffer()
    const watermarkWithOpacity = await encodeWatermarkOpacity(resizedWatermark, opacity)
    const watermarkMetadata = await sharp(watermarkWithOpacity).metadata()
    const overlayPosition = getWatermarkPlacement(
      position,
      resizedMetadata.width || maxSize,
      resizedMetadata.height || maxSize,
      watermarkMetadata.width || watermarkWidth,
      watermarkMetadata.height || 1
    )

    const watermarkedImage = await sharp(resizedImage)
      .composite([
        {
          input: watermarkWithOpacity,
          top: overlayPosition.top,
          left: overlayPosition.left,
          blend: 'over'
        }
      ])
      .toBuffer()

    return { success: true, buffer: watermarkedImage }
  } catch (error) {
    console.error('Create watermark error:', error)
    return { success: false, error: error.message }
  }
})
