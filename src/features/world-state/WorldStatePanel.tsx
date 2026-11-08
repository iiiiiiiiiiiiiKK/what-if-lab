import type { Simulation } from '../../types/simulation'
import { useTranslation } from '../../stores/preferences'
import { DirectionBadge, ConfidenceBadge, SectionTitle } from '../../components/ui/Badges'

export function WorldStatePanel({ simulation }: { simulation: Simulation }) {
  const { t } = useTranslation()
  const metrics = simulation.worldState
  const hasQuantified = metrics.some((metric) => metric.quantified)

  return (
    <section>
      <SectionTitle hint={t('world.qualitativeOnly')}>{t('world.tab.state')}</SectionTitle>
      {metrics.length === 0 ? <p className="text-xs text-dim">{t('world.empty')}</p> : null}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <article key={metric.id} className="panel-tight p-3.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim">{t(`domain.${metric.domain}`)}</p>
                <h3 className="mt-0.5 text-[13px] font-bold leading-snug">{metric.name}</h3>
              </div>
              <DirectionBadge direction={metric.direction} />
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-soft">{metric.note}</p>
            <div className="mt-2 flex items-center justify-between">
              <ConfidenceBadge confidence={metric.confidence} />
              {metric.quantified ? (
                <span className="tag tag-inference" title={t('world.modelOutput')}>
                  {metric.quantified.value} {metric.quantified.unit}
                </span>
              ) : null}
            </div>
            {metric.quantified ? (
              <dl className="mt-2 space-y-0.5 border-t border-[var(--border)] pt-2 text-[10.5px] text-dim">
                <div className="flex gap-1">
                  <dt className="font-semibold">{t('world.modelOutput')}:</dt>
                  <dd className="truncate">{metric.quantified.source}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="font-semibold">method:</dt>
                  <dd className="truncate">{metric.quantified.method}</dd>
                </div>
                <div className="flex gap-1">
                  <dt className="font-semibold">assumptions:</dt>
                  <dd className="truncate">{metric.quantified.assumptions}</dd>
                </div>
              </dl>
            ) : null}
          </article>
        ))}
      </div>
      {!hasQuantified ? (
        <p className="mt-3 rounded-lg border border-[var(--border)] px-3 py-2 text-[11px] leading-relaxed text-dim">
          {t('world.qualitativeOnly')}
        </p>
      ) : null}
    </section>
  )
}
