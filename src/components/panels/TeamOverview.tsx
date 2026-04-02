import { useTeamStore } from '@/store/teamStore'
import { Users, Crown, Clock, Activity } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function TeamOverview() {
  const { team, metrics, agents } = useTeamStore()

  if (!team) return null

  const leader = agents.find(a => a.isLeader)
  const teammates = agents.filter(a => !a.isLeader)

  const stats = [
    {
      label: 'Team Members',
      value: agents.length,
      subtext: `${teammates.length} teammates + 1 lead`,
      icon: Users,
      color: 'text-sky-300',
      bgColor: 'bg-sky-500/15',
    },
    {
      label: 'Active Agents',
      value: metrics?.agentStats.active || 0,
      subtext: `${metrics?.agentStats.idle || 0} idle`,
      icon: Activity,
      color: 'text-emerald-300',
      bgColor: 'bg-emerald-500/15',
    },
    {
      label: 'Uptime',
      value: formatDistanceToNow(team.createdAt, { addSuffix: false }),
      subtext: 'since team creation',
      icon: Clock,
      color: 'text-amber-300',
      bgColor: 'bg-amber-500/15',
    },
    {
      label: 'Total Tokens',
      value: metrics?.tokenUsage.total.toLocaleString() || '0',
      subtext: 'lifetime usage',
      icon: Crown,
      color: 'text-lime-300',
      bgColor: 'bg-lime-500/15',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="terminal-panel flex items-start justify-between p-4">
        <div>
          <h2 className="text-xl font-bold text-emerald-100">{team.name}</h2>
          {team.description && (
            <p className="mt-1 text-sm text-emerald-200/60">{team.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 border border-emerald-500/20 bg-black/30 px-3 py-1.5">
          <Crown className="h-4 w-4 text-amber-300" />
          <span className="text-sm text-emerald-100">{leader?.displayName || team.leadAgentId}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="terminal-panel p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="terminal-title">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-100">{stat.value}</p>
                <p className="mt-0.5 text-xs text-emerald-200/50">{stat.subtext}</p>
              </div>
              <div className={`border border-white/10 p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {metrics && (
        <div className="terminal-panel flex items-center gap-3 p-3">
          <span className="terminal-title">Task Status</span>
          <div className="flex items-center gap-3">
            <StatusBadge count={metrics.taskStats.pending} label="Pending" color="amber" />
            <StatusBadge count={metrics.taskStats.running} label="Running" color="emerald" />
            <StatusBadge count={metrics.taskStats.completed} label="Completed" color="blue" />
            <StatusBadge count={metrics.taskStats.error} label="Error" color="red" />
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ count, label, color }: { count: number; label: string; color: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    amber: { bg: 'bg-amber-500/15', text: 'text-amber-300' },
    emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-300' },
    blue: { bg: 'bg-blue-500/15', text: 'text-blue-300' },
    red: { bg: 'bg-red-500/15', text: 'text-red-300' },
  }

  const { bg, text } = colorMap[color]

  return (
    <div className={`flex items-center gap-1.5 border border-white/10 px-2 py-0.5 ${bg}`}>
      <span className={`text-sm font-medium ${text}`}>{count}</span>
      <span className={`text-xs ${text} opacity-80`}>{label}</span>
    </div>
  )
}
