import { spawn } from 'child_process'
import net from 'net'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const apiPort = Number(process.env.DASHBOARD_API_PORT || 3001)

function isPortInUse(port) {
  return new Promise(resolve => {
    const socket = new net.Socket()
    socket.setTimeout(1000)

    socket.once('connect', () => {
      socket.destroy()
      resolve(true)
    })
    socket.once('timeout', () => {
      socket.destroy()
      resolve(false)
    })
    socket.once('error', () => {
      resolve(false)
    })

    socket.connect(port, '127.0.0.1')
  })
}

let api = null

if (await isPortInUse(apiPort)) {
  console.log(`[web-dev] API already running on port ${apiPort}, reusing it.`)
} else {
  api = spawn(process.execPath, ['scripts/web-api.mjs', '--dev'], {
    cwd: projectRoot,
    stdio: 'inherit',
  })
}

const ui =
  process.platform === 'win32'
    ? spawn('npm.cmd', ['run', 'dev:ui'], {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: false,
      })
    : spawn('npm', ['run', 'dev:ui'], {
        cwd: projectRoot,
        stdio: 'inherit',
      })

const shutdown = () => {
  if (api) api.kill('SIGINT')
  ui.kill('SIGINT')
}

if (api) {
  api.on('exit', code => {
    if (code && code !== 0) process.exit(code)
    shutdown()
  })
}

ui.on('exit', code => {
  if (code && code !== 0) process.exit(code)
  shutdown()
})

if (api) {
  api.on('error', err => {
    console.error('[web-dev] failed to start api process:', err)
    process.exit(1)
  })
}

ui.on('error', err => {
  console.error('[web-dev] failed to start ui process:', err)
  process.exit(1)
})

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
