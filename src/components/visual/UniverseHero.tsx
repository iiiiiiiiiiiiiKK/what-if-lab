import { useMemo } from 'react'

interface UniverseHeroProps {
  /** Branch labels shown at the tips of the tree. */
  labels: string[]
  className?: string
}

/**
 * Decorative-but-meaningful parallel-universe map: one reality line with
 * hypothesis branches. Pure SVG so it stays crisp and cheap on mobile.
 */
export function UniverseHero({ labels, className }: UniverseHeroProps) {
  const branches = useMemo(() => {
    const count = Math.max(3, Math.min(labels.length, 5))
    return Array.from({ length: count }, (_, index) => {
      const t = (index + 1) / (count + 1)
      const startY = 0.5
      const endY = 0.08 + t * 0.84
      const midX = 0.42 + (index % 3) * 0.06
      return {
        label: labels[index] ?? '',
        path: `M 0 ${startY * 100} C ${midX * 60} ${startY * 100}, ${midX * 70} ${endY * 100}, 100 ${endY * 100}`,
        endY,
        color: ['#6ee7ff', '#a78bfa', '#f59e0b', '#34d399', '#fb7185'][index % 5],
      }
    })
  }, [labels])

  return (
    <div className={className} aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <linearGradient id="reality-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6ee7ff" stopOpacity="0.05" />
            <stop offset="45%" stopColor="#6ee7ff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.2" />
          </linearGradient>
          <radialGradient id="node-glow">
            <stop offset="0%" stopColor="#6ee7ff" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#6ee7ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* reality line */}
        <line x1="0" y1="50" x2="100" y2="50" stroke="url(#reality-line)" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />

        {branches.map((branch, index) => (
          <g key={branch.label || index}>
            <path
              d={branch.path}
              fill="none"
              stroke={branch.color}
              strokeOpacity="0.55"
              strokeWidth="0.4"
              vectorEffect="non-scaling-stroke"
              strokeDasharray="2 2"
            />
            <circle cx="100" cy={branch.endY * 100} r="2.6" fill="url(#node-glow)" />
            <circle cx="100" cy={branch.endY * 100} r="0.9" fill={branch.color} />
          </g>
        ))}

        {/* reality nodes */}
        {[10, 30, 50, 70, 90].map((x) => (
          <circle key={x} cx={x} cy="50" r="0.7" fill="#6ee7ff" opacity={x === 50 ? 0.95 : 0.5} />
        ))}
      </svg>
    </div>
  )
}
