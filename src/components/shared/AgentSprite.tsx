import { useEffect, useState } from 'react'

export type ClawdPose = 'default' | 'work-a' | 'work-b' | 'look-left' | 'look-right'

const CLAWD_LINES: Record<ClawdPose, string[]> = {
  default: [
    '  [^_^]  ',
    ' /|_|\\  ',
    '  / \\   ',
  ],
  'look-left': [
    '  [<_^]  ',
    ' /|_|\\  ',
    '  / \\   ',
  ],
  'look-right': [
    '  [^_>]  ',
    ' /|_|\\  ',
    '  / \\   ',
  ],
  'work-a': [
    '  [^_^]  ',
    ' _/|_|\\ ',
    '   / \\  ',
  ],
  'work-b': [
    '  [^_^]  ',
    ' /|_|\\_ ',
    '   / \\  ',
  ],
}

const SPEED_MS: Record<string, number> = {
  working: 220,
  idle: 700,
  waiting: 900,
  error: 0,
  finished: 0,
  offline: 0,
}

const SEQUENCES: Record<string, ClawdPose[]> = {
  working: ['work-a', 'default', 'work-b', 'default'],
  idle: ['default', 'default', 'look-left', 'default', 'default', 'look-right'],
  waiting: ['default', 'default', 'look-left', 'default', 'look-right', 'default'],
}

interface AgentSpriteProps {
  status: 'idle' | 'working' | 'waiting' | 'error' | 'finished' | 'offline'
  color?: string
  className?: string
}

export function AgentSprite({ status, color, className }: AgentSpriteProps) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const speed = SPEED_MS[status] ?? 0
    if (speed === 0) return
    const timer = setInterval(() => setTick(t => t + 1), speed)
    return () => clearInterval(timer)
  }, [status])

  let pose: ClawdPose = 'default'
  if (status === 'working' || status === 'idle' || status === 'waiting') {
    const seq = SEQUENCES[status] ?? ['default']
    pose = seq[tick % seq.length]!
  }

  const lines = CLAWD_LINES[pose]

  let textClass = 'text-slate-300'
  if (status === 'working') textClass = 'text-emerald-300'
  else if (status === 'waiting') textClass = 'text-amber-300'
  else if (status === 'error') textClass = 'text-red-300'
  else if (status === 'offline') textClass = 'text-slate-500'

  const bouncing = status === 'working' && tick % 2 === 0

  return (
    <div
      className={[
        'flex flex-col items-center justify-center select-none font-mono text-[11px] leading-[1.05] tracking-normal',
        'transition-transform duration-75',
        bouncing ? '-translate-y-0.5' : 'translate-y-0',
        textClass,
        className || '',
      ].join(' ')}
      style={color ? { color } : undefined}
    >
      {lines.map((line, i) => (
        <pre key={i} className="m-0 p-0 font-inherit">
          {line}
        </pre>
      ))}
    </div>
  )
}
