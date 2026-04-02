interface TerminalLogoProps {
  className?: string
}

export function TerminalLogo({ className }: TerminalLogoProps) {
  return (
    <div
      className={[
        'relative grid h-8 w-8 place-items-center border border-emerald-400/40 bg-black/55',
        className || '',
      ].join(' ')}
      aria-label="Claude Code Dashboard Logo"
      role="img"
    >
      <span className="absolute left-1 top-0.5 text-[8px] text-emerald-300/80">{'>'}</span>
      <span className="text-sm font-bold leading-none text-emerald-300">C</span>
      <span className="absolute bottom-0.5 right-1 h-0.5 w-2 bg-emerald-400/80" />
    </div>
  )
}
