export type AgentStatus = 'idle' | 'working' | 'waiting' | 'error' | 'finished' | 'offline'
export type TaskStatus = 'pending' | 'running' | 'completed' | 'error' | 'cancelled'
export type PermissionMode = 'default' | 'auto' | 'ask' | 'plan'

export interface TeamMember {
  agentId: string
  name: string
  agentType?: string
  model?: string
  color?: string
  planModeRequired?: boolean
  joinedAt: number
  tmuxPaneId?: string
  cwd?: string
  worktreePath?: string
  sessionId?: string
  backendType?: 'in-process' | 'tmux' | 'iterm'
  isActive?: boolean
  mode?: PermissionMode
}

export interface TeamInfo {
  name: string
  description?: string
  createdAt: number
  leadAgentId: string
  leadSessionId?: string
  members: TeamMember[]
  hiddenPaneIds?: string[]
  teamAllowedPaths?: Array<{
    path: string
    toolName: string
    addedBy: string
    addedAt: number
  }>
}

export interface AgentState {
  id: string
  name: string
  displayName: string
  model?: string
  status: AgentStatus
  color?: string
  mode: PermissionMode
  isIdle: boolean
  isLeader: boolean
  joinedAt: number

  currentTaskId?: string
  currentTaskName?: string
  currentPrompt?: string
  awaitingPlanApproval: boolean
  shutdownRequested: boolean

  sessionId?: string
  messageCount: number
  lastMessageAt?: number
  contextLength?: number
  recentMessages?: Array<{
    role: 'user' | 'assistant' | 'system' | 'unknown'
    content: string
    timestamp?: number
  }>

  tokenUsage: {
    total: number
    thisSession: number
  }
  toolCallCount: number

  error?: string
}

export interface TaskState {
  id: string
  type: 'in_process_teammate' | 'local_agent' | 'shell' | 'workflow'
  status: TaskStatus
  title: string
  description?: string

  assignedTo?: string
  assignedBy?: string
  claimedAt?: number

  createdAt: number
  startedAt?: number
  completedAt?: number

  progress?: {
    current: number
    total: number
    message?: string
  }

  result?: {
    success: boolean
    output?: string
    error?: string
  }

  dependencies?: string[]
}

export interface MessageEvent {
  id: string
  type: 'message' | 'broadcast' | 'shutdown_request' | 'shutdown_response' | 'plan_approval' | 'system'
  from: string
  fromColor?: string
  to: string
  toColor?: string
  content: string
  summary?: string
  timestamp: number

  requestId?: string
  approved?: boolean
  reason?: string
}

export interface ResourceMetrics {
  timestamp: number

  tokenUsage: {
    total: number
    byAgent: Record<string, number>
    history: Array<{ timestamp: number; value: number }>
  }

  sessionDuration: number
  sessionStartedAt: number

  agentStats: {
    total: number
    active: number
    idle: number
    error: number
  }

  taskStats: {
    total: number
    pending: number
    running: number
    completed: number
    error: number
  }

  avgResponseTime?: number
  failedRetries: number
}

export interface ConversationSummary {
  sessionId: string
  agentId?: string
  agentName?: string
  messageCount: number
  lastMessageAt?: number
  recentMessages: Array<{
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: number
  }>
  estimatedTokens: number
  toolCalls: number
}

export interface MessageNode {
  id: string
  type: 'agent' | 'system'
  data: {
    label: string
    color?: string
    status: AgentStatus
    isLeader: boolean
  }
  position: { x: number; y: number }
}

export interface MessageEdge {
  id: string
  source: string
  target: string
  data: {
    messageCount: number
    lastMessageAt: number
    types: string[]
  }
  animated: boolean
}
