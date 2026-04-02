import { useState, useEffect } from 'react'
import { FolderOpen, RefreshCw, Users } from 'lucide-react'
import { runtimeApi } from '@/lib/runtimeApi'
import { TerminalLogo } from '@/components/shared/TerminalLogo'

interface TeamSelectorProps {
  onSelect: (teamName: string) => void
}

interface TeamOption {
  name: string
  path: string
  memberCount: number
  leadAgentId: string
}

export function TeamSelector({ onSelect }: TeamSelectorProps) {
  const [teams, setTeams] = useState<TeamOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadTeams = async () => {
    setLoading(true)
    setError(null)
    try {
      const teamList = await runtimeApi.getTeamList()
      setTeams(teamList)
    } catch {
      setError('Unable to load team list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadTeams()
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-emerald-100">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2 text-center">
          <div className="flex items-center justify-center gap-3">
            <TerminalLogo />
            <h1 className="text-2xl font-bold tracking-[0.2em]">CC Agent Teams Hub</h1>
          </div>
          <p className="text-sm text-emerald-200/70">Choose a team to start monitoring.</p>
        </div>

        {error && (
          <div className="terminal-panel border-red-500/40 bg-red-900/20 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="terminal-panel space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="terminal-title">Available Teams ({teams.length})</h2>
            <button
              onClick={() => void loadTeams()}
              disabled={loading}
              className="border border-emerald-500/25 p-1.5 text-emerald-200/80 hover:bg-emerald-500/10 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-emerald-200/60">
              <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin" />
              Loading teams...
            </div>
          ) : teams.length === 0 ? (
            <div className="border border-dashed border-emerald-500/25 py-12 text-center text-emerald-200/60">
              <FolderOpen className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <p>No teams found.</p>
              <p className="mt-1 text-sm">Create one first with `/agents spawnTeam` in Claude Code.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {teams.map(team => (
                <button
                  key={team.name}
                  onClick={() => onSelect(team.name)}
                  className="terminal-panel flex items-center justify-between p-4 text-left hover:border-emerald-400/40 hover:bg-emerald-500/5"
                >
                  <div>
                    <h3 className="text-sm font-medium text-emerald-100">{team.name}</h3>
                    <p className="mt-0.5 text-xs text-emerald-200/55">
                      Lead: {team.leadAgentId.split('@')[0]}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 border border-emerald-500/20 bg-black/30 px-2 py-1 text-sm text-emerald-200/75">
                    <Users className="h-4 w-4" />
                    {team.memberCount}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="text-center text-xs text-emerald-200/45">
          Team metadata source: ~/.claude/teams/
        </div>
      </div>
    </div>
  )
}
