import { useTeamStore } from '@/store/teamStore'
import { X, MessageSquare, Cpu, Clock, Send, Wrench } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface SessionDetailProps {
  onClose: () => void
}

export function SessionDetail({ onClose }: SessionDetailProps) {
  const agent = useTeamStore(state => state.getSelectedAgent())
  const [message, setMessage] = useState('')
  const logsRef = useRef<HTMLDivElement | null>(null)
  const currentTaskDisplay = agent?.currentTaskName || agent?.currentPrompt || agent?.currentTaskId

  if (!agent) return null

  useEffect(() => {
    if (!logsRef.current) return
    logsRef.current.scrollTop = logsRef.current.scrollHeight
  }, [agent.recentMessages, agent.id])

  const handleSend = async () => {
    if (!message.trim()) return
    await useTeamStore.getState().sendMessage(agent.name, message)
    setMessage('')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between border-b border-emerald-500/20 p-4">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="font-medium text-emerald-100">{agent.displayName}</h3>
          </div>
        </div>
        <button onClick={onClose} className="border border-emerald-500/25 p-1.5 text-emerald-200/70 hover:bg-emerald-500/10">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 border-b border-emerald-500/20 p-4">
        <StatItem icon={MessageSquare} label="Messages" value={agent.messageCount} />
        <StatItem icon={Cpu} label="Token Usage" value={agent.tokenUsage.total.toLocaleString()} />
        <StatItem icon={Wrench} label="Tool Calls" value={agent.toolCallCount} />
        <StatItem icon={Clock} label="Joined" value={formatDistanceToNow(agent.joinedAt, { addSuffix: true })} />
      </div>

      <div className="border-b border-emerald-500/20 p-4">
        <h4 className="terminal-title mb-2">Current State</h4>
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-[130px_minmax(0,1fr)] items-start gap-3">
            <span className="text-emerald-200/50">Status</span>
            <div className="min-w-0 justify-self-end">
              <StatusBadge status={agent.status} />
            </div>
          </div>
          <div className="grid grid-cols-[130px_minmax(0,1fr)] items-start gap-3">
            <span className="text-emerald-200/50">Permission Mode</span>
            <span className="min-w-0 justify-self-end text-right break-all text-emerald-100">{agent.mode}</span>
          </div>
          {currentTaskDisplay && (
            <div className="grid grid-cols-[130px_minmax(0,1fr)] items-start gap-3">
              <span className="text-emerald-200/50">Current Task</span>
              <span className="min-w-0 justify-self-end text-right break-all text-emerald-100">{currentTaskDisplay}</span>
            </div>
          )}
          {agent.contextLength && (
            <div className="grid grid-cols-[130px_minmax(0,1fr)] items-start gap-3">
              <span className="text-emerald-200/50">Context Size</span>
              <span className="min-w-0 justify-self-end text-right break-all text-emerald-100">~{agent.contextLength.toLocaleString()} tokens</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col border-b border-emerald-500/20 p-4">
        <h4 className="terminal-title mb-2">Agent Logs</h4>
        <div ref={logsRef} className="terminal-panel min-h-[160px] flex-1 overflow-auto p-2">
          {(agent.recentMessages && agent.recentMessages.length > 0) ? (
            <div className="space-y-2 text-xs">
              {agent.recentMessages.map((entry, index) => (
                <div key={`${entry.timestamp || 0}-${index}`} className="border-b border-emerald-500/10 pb-2 last:border-b-0">
                  <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide">
                    <span className="text-emerald-300/70">{entry.role}</span>
                    <span className="text-emerald-200/45">
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '--:--:--'}
                    </span>
                  </div>
                  <p className="break-words text-emerald-100/90">{entry.content || '(empty)'}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-200/50">Waiting for logs...</p>
          )}
        </div>
      </div>

      <div className="p-4">
        <h4 className="terminal-title mb-2">Send Message</h4>
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
            placeholder="Type message..."
            className="flex-1 border border-emerald-500/25 bg-black/40 px-3 py-2 text-sm text-emerald-100 placeholder:text-emerald-200/45"
          />
          <button
            onClick={() => void handleSend()}
            className="border border-emerald-400/45 bg-emerald-500/20 px-3 py-2 text-emerald-100 hover:bg-emerald-500/30"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

function StatItem({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) {
  return (
    <div className="border border-emerald-500/20 bg-black/30 p-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-emerald-300/70" />
        <p className="text-xs text-emerald-200/55">{label}</p>
      </div>
      <p className="mt-1 text-sm font-medium text-emerald-100">{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: 'text-slate-200 bg-slate-500/15 border-slate-500/40',
    working: 'text-emerald-200 bg-emerald-500/15 border-emerald-500/40',
    waiting: 'text-amber-200 bg-amber-500/15 border-amber-500/40',
    error: 'text-red-200 bg-red-500/15 border-red-500/40',
    finished: 'text-blue-200 bg-blue-500/15 border-blue-500/40',
    offline: 'text-slate-400 bg-slate-700/20 border-slate-600/40',
  }

  const labels: Record<string, string> = {
    idle: 'Idle',
    working: 'Working',
    waiting: 'Waiting',
    error: 'Error',
    finished: 'Finished',
    offline: 'Offline',
  }

  return (
    <span className={`border px-2 py-0.5 text-xs ${colors[status] || colors.offline}`}>
      {labels[status] || status}
    </span>
  )
}
