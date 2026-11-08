import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { scaleLinear } from 'd3-scale'
import { select } from 'd3-selection'
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom'
import clsx from 'clsx'
import type { Branch, DomainId, Simulation, TimelineEvent } from '../../types/simulation'
import { domainIds } from '../../types/simulation'
import { useTranslation } from '../../stores/preferences'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { formatYear, layoutTimeline, NODE_HEIGHT, NODE_WIDTH, LANE_HEIGHT } from './layout'
import { NatureTag, ConfidenceBadge } from '../../components/ui/Badges'

const domainColor: Record<DomainId, string> = {
  technology: '#6ee7ff',
  economy: '#f59e0b',
  politics: '#fb7185',
  society: '#34d399',
  culture: '#a78bfa',
  environment: '#22d3ee',
  science: '#facc15',
  finance: '#e879f9',
}

export interface TimelineExplorerProps {
  simulation: Simulation
  activeBranchId: string | null
  onSelectEvent: (event: TimelineEvent) => void
  selectedEventId?: string | null
}

export function TimelineExplorer({ simulation, activeBranchId, onSelectEvent, selectedEventId }: TimelineExplorerProps) {
  const { t, lang } = useTranslation()
  const isMobile = useIsMobile()
  const [domainFilter, setDomainFilter] = useState<DomainId | 'all'>('all')
  const [zoom, setZoom] = useState(1)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const visibleBranches = useMemo(() => {
    const list = activeBranchId
      ? simulation.branches.filter((branch) => branch.id === activeBranchId || branch.isMain)
      : simulation.branches
    return list.length > 0 ? list : simulation.branches
  }, [simulation.branches, activeBranchId])

  const branchOrder = useMemo(() => visibleBranches.map((branch) => branch.id), [visibleBranches])

  const filteredEvents = useMemo(() => {
    const ids = new Set(branchOrder)
    return simulation.events
      .filter((event) => ids.has(event.branchId))
      .filter((event) => domainFilter === 'all' || event.category === domainFilter)
  }, [simulation.events, branchOrder, domainFilter])

  const branchById = useMemo(() => {
    const map = new Map<string, Branch>()
    for (const branch of simulation.branches) map.set(branch.id, branch)
    return map
  }, [simulation.branches])

  // --- plot geometry ---
  const plot = useMemo(() => {
    const years = filteredEvents.map((event) => event.year)
    const minYear = years.length ? Math.min(...years) : 0
    const maxYear = years.length ? Math.max(...years) : 1
    const span = Math.max(1, maxYear - minYear)
    const innerWidth = Math.max(720, filteredEvents.length * 190)
    const x = scaleLinear().domain([minYear - span * 0.06, maxYear + span * 0.06]).range([28, innerWidth - 60])
    const layout = layoutTimeline({ events: filteredEvents, branchOrder }, (year) => x(year))
    return { x, minYear, maxYear, layout, innerWidth }
  }, [filteredEvents, branchOrder])

  const height = Math.max(220, plot.layout.height)

  // --- d3 zoom (wheel + drag + pinch) ---
  useEffect(() => {
    const svg = svgRef.current
    if (!svg || isMobile) return undefined

    const selection = select(svg)
    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 3.2])
      .translateExtent([
        [0, 0],
        [plot.layout.width, height],
      ])
      .on('zoom', (event) => {
        const g = svg.querySelector<SVGGElement>('[data-plot]')
        if (g) g.setAttribute('transform', String(event.transform))
      })

    selection.call(zoomBehavior)
    selection.on('dblclick.zoom', null)

    return () => {
      selection.on('.zoom', null)
    }
  }, [plot.layout.width, height, isMobile])

  const scrollToYear = useCallback(
    (year: number) => {
      const container = scrollRef.current
      if (!container) return
      const node = filteredEvents.find((event) => event.year === year)
      if (!node) return
      const rect = plot.layout.nodes.get(node.id)
      if (!rect) return
      container.scrollTo({ left: Math.max(0, rect.x - container.clientWidth / 2), behavior: 'smooth' })
    },
    [filteredEvents, plot.layout.nodes],
  )

  const handleZoomButton = (direction: 1 | -1) => {
    const svg = svgRef.current
    if (!svg) return
    const next = Math.min(3.2, Math.max(1, zoom * (direction > 0 ? 1.25 : 0.8)))
    setZoom(next)
    const g = svg.querySelector<SVGGElement>('[data-plot]')
    if (g) {
      // Keep the transform centred on the viewport centre.
      const cx = svg.clientWidth / 2
      const cy = height / 2
      const transform = zoomIdentity.translate(cx, cy).scale(next).translate(-cx, -cy)
      g.setAttribute('transform', String(transform))
    }
  }

  const resetZoom = () => {
    setZoom(1)
    const svg = svgRef.current
    const g = svg?.querySelector<SVGGElement>('[data-plot]')
    if (g) g.setAttribute('transform', String(zoomIdentity))
  }

  // ---- mobile vertical timeline ----
  if (isMobile) {
    const grouped = branchOrder.map((branchId) => ({
      branch: branchById.get(branchId),
      events: filteredEvents
        .filter((event) => event.branchId === branchId)
        .sort((a, b) => a.year - b.year),
    }))

    return (
      <div className="space-y-5">
        <DomainFilter value={domainFilter} onChange={setDomainFilter} />
        <p className="text-[11px] text-dim">{t('world.verticalHint')}</p>
        {grouped.map(({ branch, events }) =>
          branch ? (
            <section key={branch.id}>
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: branch.color }} aria-hidden />
                <h3 className="text-xs font-bold tracking-wide">{branch.name}</h3>
                <span className="text-[10px] text-dim">
                  {events.length} {t('world.events')}
                </span>
              </div>
              <ol className="relative ml-1.5 border-l border-[var(--border)] pl-4">
                {events.map((event) => (
                  <li key={event.id} className="relative pb-4">
                    <span
                      className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-[color:var(--bg)]"
                      style={{ background: domainColor[event.category] }}
                      aria-hidden
                    />
                    <button
                      type="button"
                      onClick={() => onSelectEvent(event)}
                      className={clsx(
                        'w-full rounded-xl border px-3 py-2.5 text-left transition',
                        selectedEventId === event.id
                          ? 'border-[rgba(110,231,255,0.6)] bg-[rgba(110,231,255,0.1)]'
                          : 'border-[var(--border)] bg-[rgba(255,255,255,0.02)]',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-dim">{formatYear(event.year, lang)}</span>
                        <NatureTag nature={event.nature} />
                      </div>
                      <p className="mt-1 text-[13px] font-bold leading-snug">{event.title}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-dim">{event.description}</p>
                    </button>
                  </li>
                ))}
                {events.length === 0 ? <li className="pb-3 text-[11px] text-dim">{t('world.empty')}</li> : null}
              </ol>
            </section>
          ) : null,
        )}
      </div>
    )
  }

  // ---- desktop horizontal SVG timeline ----
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <DomainFilter value={domainFilter} onChange={setDomainFilter} />
        <div className="flex items-center gap-1">
          <button type="button" className="btn btn-ghost !min-h-9 !px-2.5" onClick={() => handleZoomButton(-1)} title={t('world.zoomOut')}>
            −
          </button>
          <span className="min-w-12 text-center font-mono text-[11px] text-dim">{Math.round(zoom * 100)}%</span>
          <button type="button" className="btn btn-ghost !min-h-9 !px-2.5" onClick={() => handleZoomButton(1)} title={t('world.zoomIn')}>
            +
          </button>
          <button type="button" className="btn btn-ghost !min-h-9 !px-2.5" onClick={resetZoom} title={t('world.fit')}>
            ⤢
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="scroll-thin overflow-x-auto overflow-y-hidden rounded-xl border border-[var(--border)] bg-[rgba(6,9,18,0.45)]">
        <svg
          ref={svgRef}
          width={Math.max(plot.layout.width, 720)}
          height={height}
          viewBox={`0 0 ${Math.max(plot.layout.width, 720)} ${height}`}
          className="block touch-pan-y select-none"
          role="img"
          aria-label={t('world.title')}
        >
          <g data-plot>
            {/* lane guides */}
            {visibleBranches.map((branch, index) => (
              <g key={branch.id}>
                <line
                  x1={0}
                  y1={24 + index * LANE_HEIGHT + NODE_HEIGHT / 2}
                  x2={plot.layout.width}
                  y2={24 + index * LANE_HEIGHT + NODE_HEIGHT / 2}
                  stroke={branch.color}
                  strokeOpacity={activeBranchId === branch.id ? 0.35 : 0.14}
                  strokeDasharray="3 5"
                  strokeWidth={1}
                />
                <text
                  x={10}
                  y={18 + index * LANE_HEIGHT + NODE_HEIGHT / 2}
                  fill={branch.color}
                  fontSize={9}
                  fontWeight={700}
                  letterSpacing="0.08em"
                >
                  {branch.name.length > 26 ? `${branch.name.slice(0, 26)}…` : branch.name}
                </text>
              </g>
            ))}

            {/* causality edges */}
            {filteredEvents.map((event) => {
              if (!event.parentEventId) return null
              const from = plot.layout.nodes.get(event.parentEventId)
              const to = plot.layout.nodes.get(event.id)
              if (!from || !to) return null
              const x1 = from.x + from.width
              const y1 = from.y + from.height / 2
              const x2 = to.x
              const y2 = to.y + to.height / 2
              const midX = (x1 + x2) / 2
              return (
                <path
                  key={`${event.id}-edge`}
                  d={`M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={branchById.get(event.branchId)?.color ?? '#6ee7ff'}
                  strokeOpacity={0.42}
                  strokeWidth={1.1}
                />
              )
            })}

            {/* cross-branch relations */}
            {filteredEvents.flatMap((event) =>
              event.relatedEventIds.slice(0, 1).map((relatedId) => {
                const from = plot.layout.nodes.get(event.id)
                const to = plot.layout.nodes.get(relatedId)
                if (!from || !to) return null
                if (event.id > relatedId) return null
                return (
                  <line
                    key={`${event.id}-${relatedId}-rel`}
                    x1={from.x + from.width / 2}
                    y1={from.y + from.height / 2}
                    x2={to.x + to.width / 2}
                    y2={to.y + to.height / 2}
                    stroke="#a78bfa"
                    strokeOpacity={0.16}
                    strokeDasharray="2 4"
                  />
                )
              }),
            )}

            {/* nodes */}
            {filteredEvents.map((event) => {
              const rect = plot.layout.nodes.get(event.id)
              if (!rect) return null
              const color = domainColor[event.category]
              const isSelected = selectedEventId === event.id
              const isDimmed = activeBranchId !== null && event.branchId !== activeBranchId && !branchById.get(event.branchId)?.isMain
              return (
                <g
                  key={event.id}
                  transform={`translate(${rect.x}, ${rect.y})`}
                  opacity={isDimmed ? 0.35 : 1}
                  className="cursor-pointer"
                  onClick={() => {
                    onSelectEvent(event)
                    scrollToYear(event.year)
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                      keyboardEvent.preventDefault()
                      onSelectEvent(event)
                    }
                  }}
                  aria-label={`${formatYear(event.year, lang)} ${event.title}`}
                >
                  <rect
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={8}
                    fill={isSelected ? 'rgba(110,231,255,0.16)' : 'rgba(13,16,32,0.94)'}
                    stroke={isSelected ? '#6ee7ff' : color}
                    strokeOpacity={isSelected ? 1 : 0.45}
                    strokeWidth={isSelected ? 1.6 : 1}
                  />
                  <circle cx={10} cy={NODE_HEIGHT / 2} r={3} fill={color} />
                  <text x={19} y={16} fill="#e8ecf8" fontSize={10} fontWeight={700}>
                    {event.title.length > 21 ? `${event.title.slice(0, 21)}…` : event.title}
                  </text>
                  <text x={19} y={30} fill="#7b86a3" fontSize={8.5} fontFamily="monospace">
                    {formatYear(event.year, lang)} · {event.nature}
                  </text>
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-dim">
        <span className="font-semibold uppercase tracking-[0.1em]">{t('world.legend')}</span>
        {domainIds.map((domain) => (
          <span key={domain} className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: domainColor[domain] }} aria-hidden />
            {t(`domain.${domain}`)}
          </span>
        ))}
      </div>
    </div>
  )
}

function DomainFilter({ value, onChange }: { value: DomainId | 'all'; onChange: (value: DomainId | 'all') => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-1">
      <button
        type="button"
        className={clsx('chip !min-h-8 !px-2.5 !text-[11px]', value === 'all' && 'chip-active')}
        onClick={() => onChange('all')}
        aria-pressed={value === 'all'}
      >
        {t('world.all')}
      </button>
      {domainIds.map((domain) => (
        <button
          key={domain}
          type="button"
          className={clsx('chip !min-h-8 !px-2.5 !text-[11px]', value === domain && 'chip-active')}
          onClick={() => onChange(domain)}
          aria-pressed={value === domain}
        >
          {t(`domain.${domain}`)}
        </button>
      ))}
    </div>
  )
}

export function EventDetailPanel({
  event,
  simulation,
  onClose,
  onBranch,
}: {
  event: TimelineEvent
  simulation: Simulation
  onClose: () => void
  onBranch: () => void
}) {
  const { t, lang } = useTranslation()
  const branch = simulation.branches.find((item) => item.id === event.branchId)
  const related = simulation.events.filter((item) => event.relatedEventIds.includes(item.id))

  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] text-dim">{formatYear(event.year, lang)}</span>
            <NatureTag nature={event.nature} />
            <ConfidenceBadge confidence={event.confidence} />
          </div>
          <h3 className="mt-1.5 text-[15px] font-extrabold leading-snug">{event.title}</h3>
          {branch ? (
            <p className="mt-1 flex items-center gap-1.5 text-[11px] text-dim">
              <span className="h-2 w-2 rounded-full" style={{ background: branch.color }} aria-hidden />
              {branch.name}
            </p>
          ) : null}
        </div>
        <button type="button" onClick={onClose} className="btn btn-ghost !min-h-9 !px-2.5" aria-label={t('world.close')}>
          ✕
        </button>
      </div>

      <div className="mt-3 space-y-3 text-[12.5px] leading-relaxed">
        <Field label={t('world.what')} value={event.description} />
        <Field label={t('world.why')} value={event.cause} />
        {event.immediateEffects.length > 0 ? (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-dim">{t('world.immediate')}</p>
            <ul className="list-disc space-y-1 pl-4 text-soft">
              {event.immediateEffects.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {event.longTermEffects.length > 0 ? (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-dim">{t('world.longterm')}</p>
            <ul className="list-disc space-y-1 pl-4 text-soft">
              {event.longTermEffects.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {event.affected.length > 0 ? (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-dim">{t('world.affected')}</p>
            <div className="flex flex-wrap gap-1.5">
              {event.affected.map((item) => (
                <span key={item} className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] text-soft">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        {related.length > 0 ? (
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-dim">{t('world.related')}</p>
            <ul className="space-y-1 text-[11.5px] text-soft">
              {related.map((item) => (
                <li key={item.id} className="flex gap-2">
                  <span className="font-mono text-dim">{formatYear(item.year, lang)}</span>
                  <span className="truncate">{item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <button type="button" className="btn btn-soft mt-4 w-full !text-[12px]" onClick={onBranch}>
        {t('world.branchFrom')}
      </button>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-dim">{label}</p>
      <p className="text-soft">{value}</p>
    </div>
  )
}
