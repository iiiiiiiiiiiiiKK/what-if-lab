import type { ReactNode } from 'react'
import clsx from 'clsx'
import type { Nature, Confidence, Uncertainty, Direction } from '../../types/simulation'
import { useTranslation } from '../../stores/preferences'

export function NatureTag({ nature }: { nature: Nature }) {
  const { t } = useTranslation()
  const className =
    nature === 'FACT' ? 'tag tag-fact' : nature === 'INFERENCE' ? 'tag tag-inference' : 'tag tag-fiction'
  return (
    <span className={className} title={t(`nature.${nature}.d`)}>
      {nature}
    </span>
  )
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const { t } = useTranslation()
  const tone =
    confidence === 'high'
      ? 'text-[color:var(--color-mint)]'
      : confidence === 'medium'
        ? 'text-[color:var(--color-plasma)]'
        : 'text-[color:var(--color-ember)]'
  return <span className={clsx('text-[11px] font-semibold', tone)}>{t(`confidence.${confidence}`)}</span>
}

export function UncertaintyBadge({ uncertainty }: { uncertainty: Uncertainty }) {
  const { t } = useTranslation()
  const tone =
    uncertainty === 'low'
      ? 'border-[color:var(--color-mint)]/40 text-[color:var(--color-mint)]'
      : uncertainty === 'medium'
        ? 'border-[color:var(--color-plasma)]/40 text-[color:var(--color-plasma)]'
        : 'border-[color:var(--color-ember)]/40 text-[color:var(--color-ember)]'
  return (
    <span className={clsx('rounded-md border px-2 py-0.5 text-[11px] font-semibold', tone)}>
      {t(`uncertainty.${uncertainty}`)}
    </span>
  )
}

export function DirectionBadge({ direction }: { direction: Direction }) {
  const { t } = useTranslation()
  const map: Record<Direction, { icon: string; tone: string }> = {
    up: { icon: '↑', tone: 'text-[color:var(--color-mint)]' },
    down: { icon: '↓', tone: 'text-[color:var(--color-rose)]' },
    stable: { icon: '→', tone: 'text-[color:var(--color-plasma)]' },
    unknown: { icon: '?', tone: 'text-[color:var(--color-ember)]' },
  }
  const info = map[direction]
  return (
    <span className={clsx('inline-flex items-center gap-1 text-xs font-semibold', info.tone)}>
      <span aria-hidden>{info.icon}</span>
      {t(`direction.${direction}`)}
    </span>
  )
}

export function SectionTitle({
  children,
  hint,
  action,
}: {
  children: ReactNode
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-sm font-bold tracking-[0.14em] uppercase text-soft">{children}</h2>
        {hint ? <p className="mt-1 text-xs text-dim leading-relaxed">{hint}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div className="text-3xl opacity-60" aria-hidden>
        ⌬
      </div>
      <p className="text-sm font-semibold">{title}</p>
      {body ? <p className="max-w-md text-xs leading-relaxed text-dim">{body}</p> : null}
      {action}
    </div>
  )
}
