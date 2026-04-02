import { useTeamStore } from '@/store/teamStore'
import type { AgentState } from '@/types/index'
import { Crown, MessageCircle, AlertCircle, CheckCircle2, PauseCircle, PowerOff } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { AgentSprite } from '@/components/shared/AgentSprite'

interface AgentGridProps {
  onSelectAgent: (id: string) => void
}

export function AgentGrid({ onSelectAgent }: AgentGridProps) {
  const agents = useTeamStore(state => state.getSortedAgents())
  const selectedId = useTeamStore(state => state.selectedAgentId)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold uppercase tracking-wide text-emerald-100">Team Agents</h3>
        <span className="text-xs text-emerald-200/55">{agents.length} agents</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {agents.map(agent => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={agent.id === selectedId}
            onClick={() => onSelectAgent(agent.id)}
          />
        ))}
      </div>
    </div>
  )
}

interface AgentCardProps {
  agent: AgentState
  isSelected: boolean
  onClick: () => void
}

function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
  const statusConfig = getStatusConfig(agent.status)
  const modeColors: Record<string, string> = {
    default: 'bg-slate-400',
    auto: 'bg-emerald-400',
    ask: 'bg-amber-400',
    plan: 'bg-cyan-400',
  }

  return (
    <button
      onClick={onClick}
      className={`terminal-panel relative p-4 text-left transition-all duration-150 ${
        isSelected
          ? 'border-emerald-300/50 bg-emerald-500/10'
          : 'hover:border-emerald-400/40 hover:bg-emerald-500/5'
      }`}
    >
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        {agent.awaitingPlanApproval && (
          <span className="border border-cyan-400/35 bg-cyan-500/15 px-1.5 py-0.5 text-[10px] text-cyan-200">
            Awaiting approval
          </span>
        )}
        <statusConfig.icon className={`h-4 w-4 ${statusConfig.color}`} />
      </div>

      <div className="mb-3 flex items-center gap-3">
        <div className="flex min-w-[5.5rem] flex-shrink-0 items-center justify-center">
          <AgentSprite status={agent.status} color={agent.color} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-emerald-100">{agent.displayName}</span>
            {agent.isLeader && <Crown className="h-3.5 w-3.5 text-amber-300" />}
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${statusConfig.color}`}>{statusConfig.label}</span>
            <span className={`h-1.5 w-1.5 ${modeColors[agent.mode] || 'bg-slate-500'}`} />
            <span className="text-xs capitalize text-emerald-200/55">{agent.mode}</span>
          </div>
          {agent.model && (
            <div className="mt-0.5 text-[11px] text-emerald-200/55">
              Model: <span className="text-emerald-100/90">{agent.model}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-emerald-200/70">
          <MessageCircle className="h-3.5 w-3.5" />
          <span>{agent.messageCount} messages</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-200/70">
          <span className="text-emerald-200/45">Tokens:</span>
          <span>{agent.tokenUsage.total.toLocaleString()}</span>
        </div>
      </div>

      {agent.currentPrompt && (
        <div className="mt-2 border-t border-emerald-500/20 pt-2">
          <p className="line-clamp-2 text-xs text-emerald-200/55">{agent.currentPrompt}</p>
        </div>
      )}

      {agent.lastMessageAt && (
        <div className="mt-2 text-[10px] text-emerald-200/45">
          Last active {formatDistanceToNow(agent.lastMessageAt, { addSuffix: true })}
        </div>
      )}
    </button>
  )
}

function getStatusConfig(status: AgentState['status']) {
  const configs: Record<string, { icon: any; color: string; label: string }> = {
    idle: { icon: PauseCircle, color: 'text-slate-300', label: 'Idle' },
    working: { icon: CheckCircle2, color: 'text-emerald-300', label: 'Working' },
    waiting: { icon: PauseCircle, color: 'text-amber-300', label: 'Waiting' },
    error: { icon: AlertCircle, color: 'text-red-300', label: 'Error' },
    finished: { icon: CheckCircle2, color: 'text-blue-300', label: 'Finished' },
    offline: { icon: PowerOff, color: 'text-slate-500', label: 'Offline' },
  }
  return configs[status] || configs.offline
}
