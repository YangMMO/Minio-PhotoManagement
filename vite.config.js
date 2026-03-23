const { defineConfig } = require('vite')
const vuePlugin = require('@vitejs/plugin-vue')
const { resolve } = require('path')

const vue = vuePlugin.default || vuePlugin

module.exports = defineConfig({
  plugins: [vue()],
  base: './',
  root: 'src',
  publicDir: '../assets',
  build: {
    outDir: '../app',
    emptyOutDir: true,
    assetsDir: 'assets'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    strictPort: true
  }
})
