const DANCER_COUNT = 8

function ClawdSprite() {
  return (
    <svg viewBox="0 0 16 12" width="34" height="26" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="3" y="2" width="10" height="6" fill="#dc7a55" />
      <rect x="2" y="3" width="1" height="3" fill="#dc7a55" />
      <rect x="13" y="3" width="1" height="3" fill="#dc7a55" />
      <rect x="6" y="4" width="1" height="2" fill="#080808" />
      <rect x="10" y="4" width="1" height="2" fill="#080808" />
      <rect x="4" y="8" width="1" height="3" fill="#dc7a55" />
      <rect x="7" y="8" width="1" height="3" fill="#dc7a55" />
      <rect x="10" y="8" width="1" height="3" fill="#dc7a55" />
      <rect x="12" y="8" width="1" height="3" fill="#dc7a55" />
    </svg>
  )
}

function CampfireSprite() {
  return (
    <svg viewBox="0 0 24 24" width="48" height="48" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="5" y="17" width="14" height="2" fill="#7c3f00" />
      <rect x="7" y="15" width="3" height="2" fill="#6a2d00" />
      <rect x="14" y="15" width="3" height="2" fill="#6a2d00" />
      <rect x="11" y="7" width="2" height="8" fill="#ffd166" />
      <rect x="10" y="9" width="1" height="5" fill="#ff9f1c" />
      <rect x="13" y="9" width="1" height="5" fill="#ff9f1c" />
      <rect x="11" y="11" width="2" height="3" fill="#ff5f1f" />
    </svg>
  )
}

export function ClawdCampfire() {
  const dancers = Array.from({ length: DANCER_COUNT }, (_, i) => {
    const angle = (Math.PI * 2 * i) / DANCER_COUNT
    const x = 50 + Math.cos(angle) * 36
    const y = 50 + Math.sin(angle) * 36
    return { id: i, x, y, angle, delay: `${i * 0.12}s` }
  })

  return (
    <div className="terminal-panel relative mx-auto h-72 w-full max-w-[360px] overflow-hidden p-4">
      <p className="terminal-title text-center">Clawd Campfire Dance</p>

      <div className="relative mx-auto mt-2 h-56 w-56">
        <div className="pointer-events-none absolute inset-3 rounded-full border border-emerald-400/15" />
        <div className="pointer-events-none absolute inset-0">
          {dancers.map((dancer, index) => {
            const next = dancers[(index + 1) % dancers.length]
            const midX = (dancer.x + next.x) / 2
            const midY = (dancer.y + next.y) / 2
            const dx = next.x - dancer.x
            const dy = next.y - dancer.y
            const length = Math.hypot(dx, dy)
            const degrees = (Math.atan2(dy, dx) * 180) / Math.PI

            return (
              <div
                key={`link-${dancer.id}`}
                className="clawd-link absolute"
                style={{
                  left: `${midX}%`,
                  top: `${midY}%`,
                  width: `${length}%`,
                  transform: `translate(-50%, -50%) rotate(${degrees}deg)`,
                  animationDelay: dancer.delay,
                }}
              />
            )
          })}

          {dancers.map((dancer) => (
            <div
              key={dancer.id}
              className="absolute"
              style={{
                left: `${dancer.x}%`,
                top: `${dancer.y}%`,
                transform: `translate(-50%, -50%) rotate(${(dancer.angle * 180) / Math.PI + 90}deg)`,
              }}
            >
              <div className="clawd-dancer" style={{ animationDelay: dancer.delay }}>
                <ClawdSprite />
              </div>
            </div>
          ))}
        </div>

        <div className="absolute left-1/2 top-1/2 clawd-fire -translate-x-1/2 -translate-y-1/2">
          <CampfireSprite />
        </div>
      </div>
    </div>
  )
}
