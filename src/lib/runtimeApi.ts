import type {
  AgentState,
  ResourceMetrics,
  TaskState,
  TeamInfo,
} from '@/types/index.js'

export interface TeamOption {
  name: string
  path: string
  memberCount: number
  leadAgentId: string
}

export interface TeamDataUpdate {
  timestamp: number
  team: TeamInfo | null
  agents: AgentState[]
  tasks: TaskState[]
  metrics: ResourceMetrics
}

type Unsubscribe = () => void

class RuntimeApi {
  private eventSource: EventSource | null = null
  private readonly updateListeners = new Set<(data: TeamDataUpdate) => void>()
  private readonly errorListeners = new Set<(error: string) => void>()

  private async request<T>(input: string, init?: RequestInit): Promise<T> {
    const response = await fetch(input, init)
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.json() as Promise<T>
  }

  private ensureEventStream(): void {
    if (this.eventSource) return
    this.eventSource = new EventSource('/api/events')

    this.eventSource.addEventListener('team-data-update', event => {
      try {
        const payload = JSON.parse((event as globalThis.MessageEvent).data) as TeamDataUpdate
        this.updateListeners.forEach(listener => listener(payload))
      } catch (err) {
        this.errorListeners.forEach(listener => listener(String(err)))
      }
    })

    this.eventSource.addEventListener('collector-error', event => {
      const message = (event as globalThis.MessageEvent).data || 'Collector error'
      this.errorListeners.forEach(listener => listener(message))
    })

    this.eventSource.onerror = () => {
      this.errorListeners.forEach(listener =>
        listener('Lost connection to local dashboard API server.'),
      )
    }
  }

  async getTeamList(): Promise<TeamOption[]> {
    return this.request<TeamOption[]>('/api/teams')
  }

  async selectTeam(teamName: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/select-team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamName }),
    })
  }

  async sendMessage(params: { to: string; content: string }): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })
  }

  onTeamDataUpdate(callback: (data: TeamDataUpdate) => void): Unsubscribe {
    this.ensureEventStream()
    this.updateListeners.add(callback)
    return () => this.updateListeners.delete(callback)
  }

  onCollectorError(callback: (error: string) => void): Unsubscribe {
    this.ensureEventStream()
    this.errorListeners.add(callback)
    return () => this.errorListeners.delete(callback)
  }
}

export const runtimeApi = new RuntimeApi()
