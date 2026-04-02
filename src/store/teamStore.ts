import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  TeamInfo,
  AgentState,
  TaskState,
  ResourceMetrics,
} from '@/types/index.js'
import { runtimeApi } from '@/lib/runtimeApi'

interface TeamStore {
  team: TeamInfo | null
  agents: AgentState[]
  tasks: TaskState[]
  metrics: ResourceMetrics | null
  lastUpdate: number
  isConnected: boolean
  error: string | null

  selectedAgentId: string | null
  activeTab: 'overview' | 'tasks'
  displayMode: 'normal' | 'compact' | 'fullscreen'
  showOfflineAgents: boolean

  taskFilter: 'all' | 'pending' | 'running' | 'completed' | 'error'
  agentSortBy: 'name' | 'status' | 'joinedAt'

  setData: (data: {
    team: TeamInfo | null
    agents: AgentState[]
    tasks: TaskState[]
    metrics: ResourceMetrics
  }) => void
  setError: (error: string | null) => void
  setConnected: (connected: boolean) => void
  selectAgent: (id: string | null) => void
  clearTeam: () => void
  setActiveTab: (tab: 'overview' | 'tasks') => void
  setDisplayMode: (mode: 'normal' | 'compact' | 'fullscreen') => void
  setShowOfflineAgents: (show: boolean) => void
  setTaskFilter: (filter: 'all' | 'pending' | 'running' | 'completed' | 'error') => void
  setAgentSortBy: (sortBy: 'name' | 'status' | 'joinedAt') => void
  sendMessage: (to: string, content: string) => Promise<void>

  getLeader: () => AgentState | undefined
  getTeammates: () => AgentState[]
  getSelectedAgent: () => AgentState | undefined
  getFilteredTasks: () => TaskState[]
  getSortedAgents: () => AgentState[]
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set, get) => ({
      team: null,
      agents: [],
      tasks: [],
      metrics: null,
      lastUpdate: 0,
      isConnected: false,
      error: null,

      selectedAgentId: null,
      activeTab: 'overview',
      displayMode: 'normal',
      showOfflineAgents: true,

      taskFilter: 'all',
      agentSortBy: 'joinedAt',

      setData: (data) => set({
        team: data.team,
        agents: data.agents,
        tasks: data.tasks,
        metrics: data.metrics,
        lastUpdate: Date.now(),
        isConnected: true,
        error: null,
      }),

      setError: (error) => set({ error, isConnected: !error }),
      setConnected: (isConnected) => set({ isConnected }),

      selectAgent: (id) => set({ selectedAgentId: id }),
      clearTeam: () => set({
        team: null,
        agents: [],
        tasks: [],
        metrics: null,
        isConnected: false,
        error: null,
        selectedAgentId: null,
      }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setDisplayMode: (mode) => set({ displayMode: mode }),
      setShowOfflineAgents: (show) => set({ showOfflineAgents: show }),
      setTaskFilter: (filter) => set({ taskFilter: filter }),
      setAgentSortBy: (sortBy) => set({ agentSortBy: sortBy }),

      sendMessage: async (to, content) => {
        try {
          const result = await runtimeApi.sendMessage({ to, content })
          if (!result.success) {
            set({ error: 'Failed to send message' })
          }
        } catch (err) {
          set({ error: String(err) })
        }
      },

      getLeader: () => {
        const state = get()
        return state.agents.find(a => a.isLeader)
      },

      getTeammates: () => {
        const state = get()
        return state.agents.filter(a => !a.isLeader)
      },

      getSelectedAgent: () => {
        const state = get()
        return state.agents.find(a => a.id === state.selectedAgentId)
      },

      getFilteredTasks: () => {
        const state = get()
        if (state.taskFilter === 'all') return state.tasks
        return state.tasks.filter(t => t.status === state.taskFilter)
      },

      getSortedAgents: () => {
        const state = get()
        const agents = state.showOfflineAgents
          ? state.agents
          : state.agents.filter(a => a.status !== 'offline')

        return agents.sort((a, b) => {
          switch (state.agentSortBy) {
            case 'name':
              return a.displayName.localeCompare(b.displayName)
            case 'status': {
              const statusOrder = { working: 0, waiting: 1, idle: 2, error: 3, finished: 4, offline: 5 }
              return statusOrder[a.status] - statusOrder[b.status]
            }
            case 'joinedAt':
            default:
              return a.joinedAt - b.joinedAt
          }
        })
      },
    }),
    {
      name: 'claude-team-dashboard-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeTab: state.activeTab,
        taskFilter: state.taskFilter,
        showOfflineAgents: state.showOfflineAgents,
        agentSortBy: state.agentSortBy,
      }),
    },
  ),
)
