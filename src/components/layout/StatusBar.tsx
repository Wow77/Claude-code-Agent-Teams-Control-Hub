import { useTeamStore } from '@/store/teamStore'
import { Wifi, WifiOff, Clock, Users, Cpu } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function StatusBar() {
  const { isConnected, lastUpdate, metrics, agents, tasks } = useTeamStore()

  const workingAgents = agents.filter(a => a.status === 'working').length
  const runningTasks = tasks.filter(t => t.status === 'running').length

  return (
    <footer className="terminal-panel border-x-0 border-b-0 px-4 py-2 text-xs text-emerald-200/70">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-red-400" />
            )}
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Last update:{' '}
              {lastUpdate ? formatDistanceToNow(lastUpdate, { addSuffix: true }) : 'never'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>
              Active agents: {workingAgents}/{agents.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Cpu className="h-3.5 w-3.5" />
            <span>
              Running tasks: {runningTasks}/{tasks.length}
            </span>
          </div>

          {metrics && (
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-200/50">Tokens:</span>
              <span>{metrics.tokenUsage.total.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
