const http = require('http')
const net = require('net')
const path = require('path')
const { spawn } = require('child_process')
const electronBinary = require('electron')

const rootDir = path.resolve(__dirname, '..')
const vitePackagePath = require.resolve('vite/package.json')
const vitePackage = require(vitePackagePath)
const viteCli = path.join(path.dirname(vitePackagePath), vitePackage.bin.vite)
const preferredPort = Number(process.env.VITE_PORT || 5173)

let viteProcess = null
let electronProcess = null
let shuttingDown = false

function log(message) {
  process.stdout.write(`[dev] ${message}\n`)
}

function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const tryPort = (port) => {
      const server = net.createServer()

      server.once('error', (error) => {
        server.close()

        if (error.code === 'EADDRINUSE') {
          tryPort(port + 1)
          return
        }

        reject(error)
      })

      server.once('listening', () => {
        const { port: availablePort } = server.address()
        server.close(() => resolve(availablePort))
      })

      server.listen(port, '127.0.0.1')
    }

    tryPort(startPort)
  })
}

function waitForServer(port, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(
        {
          host: '127.0.0.1',
          port,
          path: '/',
          timeout: 1500
        },
        (response) => {
          response.resume()
          resolve()
        }
      )

      request.on('error', () => {
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for Vite on port ${port}`))
          return
        }

        setTimeout(attempt, 500)
      })

      request.on('timeout', () => {
        request.destroy()
      })
    }

    attempt()
  })
}

function killProcess(child) {
  if (!child || child.killed) {
    return
  }

  child.kill('SIGTERM')
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  killProcess(electronProcess)
  killProcess(viteProcess)

  setTimeout(() => {
    process.exit(exitCode)
  }, 200)
}

function startProcess(command, args, env) {
  return spawn(command, args, {
    cwd: rootDir,
    env,
    stdio: 'inherit'
  })
}

async function main() {
  const port = await findAvailablePort(preferredPort)
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    VITE_PORT: String(port)
  }

  delete env.ELECTRON_RUN_AS_NODE

  if (port !== preferredPort) {
    log(`Port ${preferredPort} is in use, switched to ${port}`)
  }

  viteProcess = startProcess(process.execPath, [viteCli, '--host', '127.0.0.1', '--port', String(port), '--strictPort'], env)

  viteProcess.on('exit', (code) => {
    if (!shuttingDown) {
      log(`Vite exited with code ${code ?? 0}`)
      shutdown(code ?? 0)
    }
  })

  await waitForServer(port)
  log(`Vite is ready on http://127.0.0.1:${port}`)

  electronProcess = startProcess(electronBinary, ['.'], env)

  electronProcess.on('exit', (code) => {
    if (!shuttingDown) {
      log(`Electron exited with code ${code ?? 0}`)
      shutdown(code ?? 0)
    }
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`)
  shutdown(1)
})
