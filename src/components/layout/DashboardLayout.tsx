import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { useTeamStore } from '@/store/teamStore'
import { TeamOverview } from '../panels/TeamOverview'
import { AgentGrid } from '../panels/AgentGrid'
import { TaskTimeline } from '../panels/TaskTimeline'
import { SessionDetail } from '../panels/SessionDetail'
import { StatusBar } from './StatusBar'
import { TeamSelector } from './TeamSelector'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LayoutGrid, ListTodo, ArrowLeft } from 'lucide-react'
import { runtimeApi } from '@/lib/runtimeApi'

const DETAIL_MIN_WIDTH = 320
const DETAIL_MAX_WIDTH = 760

export function DashboardLayout() {
  const [selecting, setSelecting] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('claude-team-dashboard-view') === 'selector'
  })
  const [detailWidth, setDetailWidth] = useState(() => {
    if (typeof window === 'undefined') return 384
    const saved = Number(window.localStorage.getItem('claude-team-dashboard-detail-width'))
    if (!Number.isFinite(saved)) return 384
    return Math.min(Math.max(saved, DETAIL_MIN_WIDTH), DETAIL_MAX_WIDTH)
  })
  const [isResizing, setIsResizing] = useState(false)

  const {
    team,
    activeTab,
    setActiveTab,
    selectedAgentId,
    selectAgent,
    setData,
    setError,
    clearTeam,
    isConnected,
    error,
  } = useTeamStore()

  useEffect(() => {
    if (selecting) return
    const unsubscribe = runtimeApi.onTeamDataUpdate((data) => {
      setData({
        team: data.team,
        agents: data.agents,
        tasks: data.tasks,
        metrics: data.metrics,
      })
    })
    return unsubscribe
  }, [setData, selecting])

  useEffect(() => {
    if (selecting) return
    const unsubscribe = runtimeApi.onCollectorError((err) => {
      setError(err)
    })
    return unsubscribe
  }, [setError, selecting])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      'claude-team-dashboard-view',
      selecting ? 'selector' : 'team',
    )
  }, [selecting])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(
      'claude-team-dashboard-detail-width',
      String(detailWidth),
    )
  }, [detailWidth])

  const handleBack = () => {
    clearTeam()
    setSelecting(true)
  }

  const handleSelect = (name: string) => {
    setSelecting(false)
    setActiveTab('overview')
    void runtimeApi.selectTeam(name)
  }

  const startResize = (startEvent: ReactMouseEvent<HTMLDivElement>) => {
    startEvent.preventDefault()
    setIsResizing(true)

    const onMouseMove = (event: MouseEvent) => {
      const nextWidth = window.innerWidth - event.clientX
      const clamped = Math.min(Math.max(nextWidth, DETAIL_MIN_WIDTH), DETAIL_MAX_WIDTH)
      setDetailWidth(clamped)
    }

    const onMouseUp = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  if (selecting || !team) {
    return <TeamSelector onSelect={handleSelect} />
  }

  return (
    <div className={`flex h-screen flex-col overflow-hidden text-emerald-100 ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
      <header className="terminal-panel flex items-center justify-between border-x-0 border-t-0 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center gap-1 border border-emerald-500/20 px-2 py-1 text-xs uppercase text-emerald-300/75 hover:bg-emerald-500/10"
            title="Back to team selection"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'tasks')}>
          <TabsList>
            <TabsTrigger value="overview" className="gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5">
              <ListTodo className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4">
          {error && (
            <div className="terminal-panel mb-4 border-red-500/40 bg-red-900/20 p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {!isConnected && !error && (
            <div className="terminal-panel mb-4 border-amber-500/40 bg-amber-900/20 p-3 text-sm text-amber-200">
              Connecting to team runtime...
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-4">
              <TeamOverview />
              <AgentGrid onSelectAgent={selectAgent} />
            </div>
          )}

          {activeTab === 'tasks' && <TaskTimeline />}
        </div>

        {selectedAgentId && (
          <>
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize details panel"
              onMouseDown={startResize}
              className="w-1.5 shrink-0 cursor-col-resize bg-emerald-500/10 hover:bg-emerald-400/30"
            />
            <div
              className="terminal-panel shrink-0 border-y-0 border-r-0 overflow-auto"
              style={{ width: `${detailWidth}px` }}
            >
              <SessionDetail onClose={() => selectAgent(null)} />
            </div>
          </>
        )}
      </main>

      <StatusBar />
    </div>
  )
}
