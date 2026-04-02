#!/usr/bin/env node
import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const dashboardDir = path.join(__dirname, '..')

const args = process.argv.slice(2)
const teamArg = args.find(arg => arg.startsWith('--team='))

if (teamArg) {
  console.log(`[claude-dashboard] team hint received: ${teamArg}`)
}

console.log('[claude-dashboard] starting web dashboard...')

const proc =
  process.platform === 'win32'
    ? spawn('cmd.exe', ['/d', '/s', '/c', 'npm run web:dev'], {
        cwd: dashboardDir,
        stdio: 'inherit',
      })
    : spawn('npm', ['run', 'web:dev'], {
        cwd: dashboardDir,
        stdio: 'inherit',
      })

proc.on('error', err => {
  console.error('[claude-dashboard] failed to start web dashboard:', err)
  process.exit(1)
})

proc.on('exit', code => {
  process.exit(code ?? 0)
})
