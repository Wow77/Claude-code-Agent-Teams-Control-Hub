import chokidar from 'chokidar'
import fs from 'fs/promises'
import { createReadStream } from 'fs'
import http from 'http'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')
const isDev = process.argv.includes('--dev')
const port = Number(process.env.DASHBOARD_API_PORT || 3001)
const homedir = process.platform === 'win32'
  ? (process.env.USERPROFILE || process.env.HOMEDRIVE + process.env.HOMEPATH || process.env.HOME || '')
  : (process.env.HOME || '')
const claudeDir = path.join(homedir, '.claude')
const toTeamTaskDirName = (name = '') => name.toLowerCase().replace(/[^a-z0-9]/g, '-')

function extractMessageText(entry) {
  const content = entry?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (!part) return ''
        if (typeof part === 'string') return part
        if (typeof part.text === 'string') return part.text
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

class TeamDataCollector {
  constructor({ teamName, onUpdate, onError }) {
    this.teamName = teamName
    this.onUpdate = onUpdate
    this.onError = onError
    this.watchers = []
    this.intervalId = undefined
    this.teamConfig = null
    this.sessionCache = new Map()
    this.metricsHistory = []
  }

  async start() {
    if (!this.teamName) return
    try {
      await this.loadTeamConfig()
      this.startWatching()
      this.intervalId = setInterval(() => void this.emitUpdate(), 2000)
      await this.emitUpdate()
    } catch (error) {
      this.onError(`Failed to start collector: ${String(error)}`)
    }
  }

  stop() {
    this.watchers.forEach(w => void w.close())
    this.watchers = []
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = undefined
    }
  }

  async loadTeamConfig() {
    if (!this.teamName) return
    const configPath = path.join(claudeDir, 'teams', this.teamName, 'config.json')
    const content = await fs.readFile(configPath, 'utf-8')
    const data = JSON.parse(content)
    this.teamConfig = {
      name: data.name || this.teamName,
      description: data.description,
      createdAt: data.createdAt || Date.now(),
      leadAgentId: data.leadAgentId,
      leadSessionId: data.leadSessionId,
      members: data.members || [],
      hiddenPaneIds: data.hiddenPaneIds,
      teamAllowedPaths: data.teamAllowedPaths,
    }
  }

  startWatching() {
    if (!this.teamName) return
    const teamDir = path.join(claudeDir, 'teams', this.teamName)
    const taskDirName = toTeamTaskDirName(this.teamName)
    const tasksDir = path.join(claudeDir, 'tasks', taskDirName)
    const sessionsDir = path.join(claudeDir, 'sessions', '*.jsonl')
    const projectSessionsDir = path.join(claudeDir, 'projects', '**', '*.jsonl')

    const configWatcher = chokidar.watch(path.join(teamDir, 'config.json'), {
      persistent: true,
      ignoreInitial: true,
    })
    configWatcher.on('change', async () => {
      try {
        await this.loadTeamConfig()
        await this.emitUpdate()
      } catch (error) {
        this.onError(`Failed to reload team config: ${String(error)}`)
      }
    })
    this.watchers.push(configWatcher)

    const taskWatcher = chokidar.watch(path.join(tasksDir, '*.json'), {
      persistent: true,
      ignoreInitial: false,
    })
    taskWatcher.on('all', async () => {
      await this.emitUpdate()
    })
    this.watchers.push(taskWatcher)

    const sessionWatcher = chokidar.watch([sessionsDir, projectSessionsDir], {
      persistent: true,
      ignoreInitial: false,
      depth: 8,
    })
    sessionWatcher.on('change', async filePath => {
      await this.parseSessionFile(filePath)
      await this.emitUpdate()
    })
    sessionWatcher.on('add', async filePath => {
      await this.parseSessionFile(filePath)
      await this.emitUpdate()
    })
    this.watchers.push(sessionWatcher)
  }

  async parseSessionFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const lines = content.split('\n').filter(Boolean)
      const sessionId = path.basename(filePath, '.jsonl')

      let messageCount = 0
      let lastTimestamp = 0
      let estimatedTokens = 0
      let toolCalls = 0
      const recentMessages = []

      for (const line of lines.slice(-100)) {
        try {
          const entry = JSON.parse(line)
          if (entry.type === 'message' || entry.type === 'user' || entry.type === 'assistant' || entry.type === 'system') {
            messageCount += 1
            lastTimestamp = Math.max(lastTimestamp, entry.timestamp || 0)
            const messageText = extractMessageText(entry)
            if (messageText) {
              estimatedTokens += Math.ceil(messageText.length / 4)
            }
            if (recentMessages.length < 10) {
              recentMessages.unshift({
                role: entry.message?.role || entry.type || 'unknown',
                content: messageText.slice(0, 400),
                timestamp: entry.timestamp,
              })
            }
          }
          if (entry.type === 'tool_use' || entry.type === 'tool_result') {
            toolCalls += 1
          }
        } catch {
          // Ignore malformed lines.
        }
      }

      this.sessionCache.set(sessionId, {
        sessionId,
        messageCount,
        lastMessageAt: lastTimestamp,
        estimatedTokens,
        toolCalls,
        recentMessages: recentMessages.reverse(),
      })
    } catch {
      // Ignore unreadable session files.
    }
  }

  async parseTasks() {
    if (!this.teamName) return []
    const taskDirName = toTeamTaskDirName(this.teamName)
    const tasksRoot = path.join(claudeDir, 'tasks')
    const candidateDirs = [
      path.join(tasksRoot, this.teamName),
      path.join(tasksRoot, taskDirName),
      this.teamConfig?.leadSessionId ? path.join(tasksRoot, this.teamConfig.leadSessionId) : '',
    ].filter(Boolean)
    const tasks = []
    const tryReadTaskFile = async (taskPath) => {
      try {
        const content = await fs.readFile(taskPath, 'utf-8')
        const data = JSON.parse(content)
        const file = path.basename(taskPath)
        tasks.push({
          id: data.id || file.replace('.json', ''),
          type: this.mapTaskType(data.type),
          status: this.mapTaskStatus(data.status),
          title: data.title || data.subject || data.activeForm || String(data.prompt || '').slice(0, 80) || 'Untitled Task',
          description: data.description || data.activeForm || data.prompt,
          assignedTo: data.assignedTo || data.identity?.agentId || data.agentId || data.assignee,
          assignedBy: data.assignedBy,
          claimedAt: data.claimedAt,
          createdAt: data.createdAt || Date.now(),
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          progress: data.progress,
          result: data.result,
          dependencies: data.dependencies,
        })
      } catch {
        // Ignore malformed task files.
      }
    }

    for (const dir of candidateDirs) {
      try {
        const files = await fs.readdir(dir)
        for (const file of files) {
          if (!file.endsWith('.json')) continue
          await tryReadTaskFile(path.join(dir, file))
        }
      } catch {
        // Ignore missing candidate dir.
      }
    }

    if (tasks.length === 0) {
      try {
        const entries = await fs.readdir(tasksRoot, { withFileTypes: true })
        for (const entry of entries) {
          if (!entry.isDirectory()) continue
          const dir = path.join(tasksRoot, entry.name)
          const files = await fs.readdir(dir)
          for (const file of files) {
            if (!file.endsWith('.json')) continue
            await tryReadTaskFile(path.join(dir, file))
          }
        }
      } catch {
        // Ignore fallback scan errors.
      }
    }
    return tasks
  }

  async parseInboxes() {
    const map = new Map()
    if (!this.teamName) return map

    const inboxDir = path.join(claudeDir, 'teams', this.teamName, 'inboxes')
    try {
      const files = await fs.readdir(inboxDir)
      for (const file of files) {
        if (!file.endsWith('.json')) continue
        const raw = await fs.readFile(path.join(inboxDir, file), 'utf-8')
        const entries = JSON.parse(raw)
        if (!Array.isArray(entries)) continue
        const recipientName = path.basename(file, '.json')
        const recipientKey = recipientName.includes('@') ? recipientName : `${recipientName}@${this.teamName}`

        for (const entry of entries) {
          const sender = String(entry.from || 'unknown')
          const senderKey = sender.includes('@') ? sender : `${sender}@${this.teamName}`
          const row = {
            role: 'assistant',
            content: String(entry.text || entry.summary || ''),
            timestamp: entry.timestamp ? new Date(entry.timestamp).getTime() : undefined,
          }
          if (!map.has(recipientKey)) map.set(recipientKey, [])
          map.get(recipientKey).push(row)
          if (!map.has(senderKey)) map.set(senderKey, [])
          map.get(senderKey).push(row)
        }
      }
    } catch {
      // No inbox yet.
    }

    for (const [key, list] of map.entries()) {
      list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
      map.set(key, list.slice(-30))
    }
    return map
  }

  mapTaskType(type) {
    switch (type) {
      case 'in_process_teammate':
      case 'local_agent':
      case 'shell':
      case 'workflow':
        return type
      default:
        return 'local_agent'
    }
  }

  mapTaskStatus(status) {
    switch (status) {
      case 'pending':
      case 'running':
      case 'completed':
      case 'error':
      case 'cancelled':
        return status
      case 'success':
        return 'completed'
      case 'failed':
        return 'error'
      default:
        return 'pending'
    }
  }

  buildAgentStates(members, tasks, inboxMap) {
    return members.map(member => {
      const sessionData = this.sessionCache.get(member.sessionId || '')
      const agentTasks = tasks.filter(t => t.assignedTo === member.agentId)
      const currentTask = agentTasks.find(t => t.status === 'running')
      const inboxMessages = inboxMap.get(member.agentId) || []
      const recentMessages = (sessionData?.recentMessages?.length ? sessionData.recentMessages : inboxMessages) || []

      let status = 'offline'
      if (member.isActive === false) status = 'idle'
      else if (member.isActive === true || agentTasks.some(t => t.status === 'running')) status = 'working'
      else if (agentTasks.some(t => t.status === 'error')) status = 'error'
      else if (member.joinedAt) status = 'idle'

        return {
          id: member.agentId,
          name: member.agentId,
          displayName: member.agentId || member.name,
          model: member.model,
          status,
          color: member.color,
        mode: member.mode || 'default',
        isIdle: status === 'idle',
        isLeader: member.agentId === this.teamConfig?.leadAgentId,
        joinedAt: member.joinedAt,
        currentTaskId: currentTask?.id,
        currentTaskName: currentTask ? (currentTask.title || currentTask.description || currentTask.id) : undefined,
        currentPrompt: currentTask?.description || currentTask?.title,
        awaitingPlanApproval: false,
        shutdownRequested: false,
        sessionId: member.sessionId,
        messageCount: sessionData?.messageCount || 0,
        lastMessageAt: sessionData?.lastMessageAt,
        contextLength: sessionData?.estimatedTokens,
        recentMessages,
        tokenUsage: {
          total: sessionData?.estimatedTokens || 0,
          thisSession: sessionData?.estimatedTokens || 0,
        },
        toolCallCount: sessionData?.toolCalls || 0,
      }
    })
  }

  buildMetrics(agents, tasks) {
    const now = Date.now()
    const totalTokens = agents.reduce((sum, a) => sum + a.tokenUsage.total, 0)
    this.metricsHistory.push({ timestamp: now, value: totalTokens })
    if (this.metricsHistory.length > 100) this.metricsHistory.shift()
    return {
      timestamp: now,
      tokenUsage: {
        total: totalTokens,
        byAgent: Object.fromEntries(agents.map(a => [a.id, a.tokenUsage.total])),
        history: [...this.metricsHistory],
      },
      sessionDuration: this.teamConfig ? Math.floor((now - this.teamConfig.createdAt) / 1000) : 0,
      sessionStartedAt: this.teamConfig?.createdAt || now,
      agentStats: {
        total: agents.length,
        active: agents.filter(a => a.status === 'working').length,
        idle: agents.filter(a => a.status === 'idle').length,
        error: agents.filter(a => a.status === 'error').length,
      },
      taskStats: {
        total: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        running: tasks.filter(t => t.status === 'running').length,
        completed: tasks.filter(t => t.status === 'completed').length,
        error: tasks.filter(t => t.status === 'error').length,
      },
      failedRetries: 0,
    }
  }

  async emitUpdate() {
    if (!this.teamConfig) return
    const tasks = await this.parseTasks()
    const inboxMap = await this.parseInboxes()
    const agents = this.buildAgentStates(this.teamConfig.members, tasks, inboxMap)
    const metrics = this.buildMetrics(agents, tasks)
    this.onUpdate({
      timestamp: Date.now(),
      team: this.teamConfig,
      agents,
      tasks,
      metrics,
    })
  }
}

let collector = null
let latestData = null
const sseClients = new Set()

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify(payload))
}

function broadcast(eventName, payload) {
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`
  sseClients.forEach(client => client.write(data))
}

function initCollector(teamName) {
  if (collector) collector.stop()
  collector = new TeamDataCollector({
    teamName,
    onUpdate: data => {
      latestData = data
      broadcast('team-data-update', data)
    },
    onError: error => {
      broadcast('collector-error', error)
    },
  })
  void collector.start()
}

async function getTeamList() {
  const teamsDir = path.join(claudeDir, 'teams')
  const teams = []
  try {
    const entries = await fs.readdir(teamsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const configPath = path.join(teamsDir, entry.name, 'config.json')
      try {
        const content = await fs.readFile(configPath, 'utf-8')
        const config = JSON.parse(content)
        teams.push({
          name: config.name || entry.name,
          path: configPath,
          memberCount: config.members?.length || 0,
          leadAgentId: config.leadAgentId,
        })
      } catch {
        // Ignore malformed team config.
      }
    }
  } catch {
    // Ignore missing teams directory.
  }
  return teams
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf-8')
  return raw ? JSON.parse(raw) : {}
}

function serveStatic(req, res) {
  const requestPath = req.url === '/' ? '/index.html' : req.url
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '')
  const filePath = path.join(projectRoot, 'dist', safePath)
  createReadStream(filePath)
    .on('error', () => {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      res.end('Not Found')
    })
    .pipe(res)
}

const server = http.createServer(async (req, res) => {
  if (!req.url || !req.method) {
    sendJson(res, 400, { error: 'Bad request' })
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    })
    res.write('event: connected\ndata: "ok"\n\n')
    if (latestData) {
      res.write(`event: team-data-update\ndata: ${JSON.stringify(latestData)}\n\n`)
    }
    sseClients.add(res)
    req.on('close', () => {
      sseClients.delete(res)
    })
    return
  }

  if (req.method === 'GET' && req.url === '/api/teams') {
    sendJson(res, 200, await getTeamList())
    return
  }

  if (req.method === 'POST' && req.url === '/api/select-team') {
    const body = await readBody(req)
    initCollector(body.teamName)
    sendJson(res, 200, { success: true })
    return
  }

  if (req.method === 'POST' && req.url === '/api/send-message') {
    const body = await readBody(req)
    console.log(`send-message (web mode) -> ${body.to}: ${body.content}`)
    sendJson(res, 200, { success: true })
    return
  }

  if (req.method === 'GET' && req.url === '/api/claude-config-dir') {
    sendJson(res, 200, { path: claudeDir })
    return
  }

  if (!isDev) {
    serveStatic(req, res)
    return
  }

  sendJson(res, 404, { error: 'Not found' })
})

server.on('error', err => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`[web-api] port ${port} is already in use. Stop the old process or set DASHBOARD_API_PORT.`)
    process.exit(1)
  }
  console.error('[web-api] server error:', err)
  process.exit(1)
})

const heartbeat = setInterval(() => {
  sseClients.forEach(client => client.write(': ping\n\n'))
}, 15000)

server.listen(port, () => {
  console.log(`[web-api] listening on http://localhost:${port} (${isDev ? 'dev api' : 'api+static'})`)
})

function shutdown() {
  clearInterval(heartbeat)
  if (collector) collector.stop()
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

