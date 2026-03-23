const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')
const { getRceditBundle } = require('app-builder-lib/out/toolsets/windows')

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function resolveRceditPath() {
  const bundle = await getRceditBundle('1.1.0')
  return process.arch === 'ia32' ? bundle.x86 : bundle.x64
}

async function setExeIconWithRetry(exePath, iconPath, retries = 8) {
  const rceditPath = await resolveRceditPath()
  let lastError = ''

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const result = spawnSync(rceditPath, [exePath, '--set-icon', iconPath], {
      encoding: 'utf8'
    })

    if (result.status === 0) {
      return
    }

    lastError = (result.stderr || result.stdout || `rcedit exited with code ${result.status ?? 'unknown'}`).trim()

    if (attempt < retries) {
      await sleep(1500)
    }
  }

  throw new Error(`Unable to set executable icon after ${retries} attempts: ${lastError}`)
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`)
  const iconPath = path.resolve(__dirname, '..', 'assets', 'icon.ico')

  if (!fs.existsSync(exePath)) {
    throw new Error(`Executable not found for icon patching: ${exePath}`)
  }

  if (!fs.existsSync(iconPath)) {
    throw new Error(`Icon file not found for icon patching: ${iconPath}`)
  }

  await setExeIconWithRetry(exePath, iconPath)
  console.log(`[afterPack] icon patched: ${exePath}`)
}
