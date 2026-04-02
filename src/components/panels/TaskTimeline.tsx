import { useTeamStore } from '@/store/teamStore'
import type { TaskState } from '@/types/index'
import { Clock, CheckCircle2, XCircle, Loader2, Circle, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function TaskTimeline() {
  const tasks = useTeamStore(state => state.getFilteredTasks())
  const taskFilter = useTeamStore(state => state.taskFilter)
  const setTaskFilter = useTeamStore(state => state.setTaskFilter)

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'running', label: 'Running' },
    { key: 'completed', label: 'Completed' },
    { key: 'error', label: 'Error' },
  ] as const

  return (
    <div className="space-y-4">
      <div className="terminal-panel flex items-center gap-2 p-3">
        <span className="terminal-title">Filter</span>
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setTaskFilter(f.key)}
            className={`border px-3 py-1 text-xs uppercase transition-colors ${
              taskFilter === f.key
                ? 'border-emerald-400/45 bg-emerald-500/15 text-emerald-100'
                : 'border-emerald-500/20 bg-black/30 text-emerald-200/60 hover:bg-emerald-500/10'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <div className="terminal-panel py-12 text-center text-emerald-200/55">
            <Circle className="mx-auto mb-3 h-12 w-12 opacity-35" />
            <p>No tasks yet.</p>
          </div>
        ) : (
          tasks.map(task => <TaskItem key={task.id} task={task} />)
        )}
      </div>
    </div>
  )
}

function TaskItem({ task }: { task: TaskState }) {
  const statusConfig = getStatusConfig(task.status)

  return (
    <div className="terminal-panel p-4 hover:border-emerald-400/35">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <statusConfig.icon className={`h-4 w-4 ${statusConfig.color}`} />
            <span className="font-medium text-emerald-100">{task.title}</span>
            <span className={`border px-1.5 py-0.5 text-[10px] ${statusConfig.bgColor} ${statusConfig.color}`}>
              {statusConfig.label}
            </span>
          </div>

          {task.description && (
            <p className="mt-1 line-clamp-2 text-sm text-emerald-200/55">{task.description}</p>
          )}

          <div className="mt-2 flex items-center gap-4 text-xs text-emerald-200/50">
            <span>Created {formatDistanceToNow(task.createdAt, { addSuffix: true })}</span>
            {task.assignedTo && (
              <span className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                Assigned to {task.assignedTo.split('@')[0]}
              </span>
            )}
            {task.startedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Started {formatDistanceToNow(task.startedAt, { addSuffix: true })}
              </span>
            )}
          </div>
        </div>

        {task.progress && (
          <div className="ml-4 w-32">
            <div className="mb-1 flex justify-between text-xs text-emerald-200/70">
              <span>{task.progress.message || 'Progress'}</span>
              <span>{Math.round((task.progress.current / task.progress.total) * 100)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden border border-emerald-500/25 bg-black/45">
              <div
                className={`h-full ${statusConfig.color.replace('text-', 'bg-')}`}
                style={{ width: `${(task.progress.current / task.progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {task.result && (
        <div className={`mt-3 border-t border-emerald-500/20 pt-3 text-sm ${
          task.result.success ? 'text-emerald-300' : 'text-red-300'
        }`}>
          {task.result.output || task.result.error}
        </div>
      )}
    </div>
  )
}

function getStatusConfig(status: TaskState['status']) {
  const configs: Record<string, { icon: any; color: string; bgColor: string; label: string }> = {
    pending: { icon: Circle, color: 'text-amber-300', bgColor: 'bg-amber-500/15 border-amber-500/35', label: 'Pending' },
    running: { icon: Loader2, color: 'text-emerald-300', bgColor: 'bg-emerald-500/15 border-emerald-500/35', label: 'Running' },
    completed: { icon: CheckCircle2, color: 'text-blue-300', bgColor: 'bg-blue-500/15 border-blue-500/35', label: 'Completed' },
    error: { icon: XCircle, color: 'text-red-300', bgColor: 'bg-red-500/15 border-red-500/35', label: 'Error' },
    cancelled: { icon: XCircle, color: 'text-slate-300', bgColor: 'bg-slate-500/15 border-slate-500/35', label: 'Cancelled' },
  }
  return configs[status] || configs.pending
}
