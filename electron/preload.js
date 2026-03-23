const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minio: {
    login: (config) => ipcRenderer.invoke('minio:login', config),
    listBuckets: () => ipcRenderer.invoke('minio:listBuckets'),
    listObjects: (bucket, prefix, recursive) => ipcRenderer.invoke('minio:listObjects', bucket, prefix, recursive),
    putObject: (bucket, name, buffer, metaData) => ipcRenderer.invoke('minio:putObject', bucket, name, buffer, metaData),
    removeObjects: (bucket, objects) => ipcRenderer.invoke('minio:removeObjects', bucket, objects),
    removeObject: (bucket, objects) => ipcRenderer.invoke('minio:removeObject', bucket, objects),
    statObject: (bucket, name) => ipcRenderer.invoke('minio:statObject', bucket, name)
  },
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (data) => ipcRenderer.invoke('config:set', data),
    clear: () => ipcRenderer.invoke('config:clear')
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', key),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    remove: (key) => ipcRenderer.invoke('settings:remove', key)
  },
  system: {
    getAppPath: () => ipcRenderer.invoke('system:getAppPath'),
    showOpenDialog: (options) => ipcRenderer.invoke('system:showOpenDialog', options)
  },
  image: {
    createThumbnail: (buffer, maxSize) => ipcRenderer.invoke('image:createThumbnail', buffer, maxSize),
    createWatermark: (buffer, options) => ipcRenderer.invoke('image:createWatermark', buffer, options)
  },
  menu: {
    setLanguage: (language) => ipcRenderer.invoke('menu:set-language', language),
    setTheme: (theme) => ipcRenderer.invoke('menu:set-theme', theme),
    onLanguageChange: (callback) => {
      const wrapped = (_event, language) => callback(language)
      ipcRenderer.on('menu:language-change', wrapped)
      return () => {
        ipcRenderer.removeListener('menu:language-change', wrapped)
      }
    },
    onThemeChange: (callback) => {
      const wrapped = (_event, theme) => callback(theme)
      ipcRenderer.on('menu:theme-change', wrapped)
      return () => {
        ipcRenderer.removeListener('menu:theme-change', wrapped)
      }
    }
  }
})
