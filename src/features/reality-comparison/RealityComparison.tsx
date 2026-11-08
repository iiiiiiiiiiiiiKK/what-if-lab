import type { Simulation } from '../../types/simulation'
import { useTranslation } from '../../stores/preferences'
import { SectionTitle, NatureTag } from '../../components/ui/Badges'
import { formatYear } from '../timeline/layout'

export function RealityComparison({ simulation }: { simulation: Simulation }) {
  const { t, lang } = useTranslation()
  const comparison = simulation.realityComparison
  const realEvents = comparison?.realEvents ?? simulation.baselineFacts
  const simulated = simulation.events.filter((event) => comparison?.simulatedEventIds?.includes(event.id) ?? false)

  return (
    <section>
      <SectionTitle hint={t('home.examplesHint')}>{t('world.tab.reality')}</SectionTitle>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="panel p-4">
          <header className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--color-mint)]" aria-hidden />
            <h3 className="text-xs font-bold uppercase tracking-[0.12em]">{t('world.realWorld')}</h3>
            <span className="tag tag-fact">FACT</span>
          </header>
          {realEvents.length === 0 ? (
            <p className="text-xs text-dim">{t('world.noBaseline')}</p>
          ) : (
            <ol className="relative border-l border-[var(--border)] pl-4">
              {realEvents
                .slice()
                .sort((a, b) => a.year - b.year)
                .map((fact) => (
                  <li key={fact.id} className="relative pb-3.5">
                    <span
                      className="absolute -left-[20px] top-1.5 h-2 w-2 rounded-full bg-[color:var(--color-mint)] ring-4 ring-[color:var(--bg)]"
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-dim">{formatYear(fact.year, lang)}</span>
                      {fact.status === 'background' ? (
                        <span className="tag tag-fiction">{t('world.backgroundNeeded')}</span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[12.5px] font-bold leading-snug">{fact.title}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-soft">{fact.description}</p>
                    {fact.sourceUrl ? (
                      <a
                        href={fact.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-[10.5px] font-semibold text-[color:var(--color-plasma)] hover:underline"
                      >
                        {fact.sourceName ?? fact.sourceUrl} ↗
                      </a>
                    ) : fact.sourceName ? (
                      <p className="mt-1 text-[10.5px] text-dim">{fact.sourceName}</p>
                    ) : null}
                  </li>
                ))}
            </ol>
          )}
        </div>

        <div className="panel p-4">
          <header className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[color:var(--color-violet)]" aria-hidden />
            <h3 className="text-xs font-bold uppercase tracking-[0.12em]">{t('world.parallelWorld')}</h3>
            <span className="tag tag-inference">INFERENCE</span>
          </header>
          {simulated.length === 0 ? (
            <p className="text-xs text-dim">{t('world.empty')}</p>
          ) : (
            <ol className="relative border-l border-[var(--border)] pl-4">
              {simulated
                .slice()
                .sort((a, b) => a.year - b.year)
                .map((event) => (
                  <li key={event.id} className="relative pb-3.5">
                    <span
                      className="absolute -left-[20px] top-1.5 h-2 w-2 rounded-full bg-[color:var(--color-violet)] ring-4 ring-[color:var(--bg)]"
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] text-dim">{formatYear(event.year, lang)}</span>
                      <NatureTag nature={event.nature} />
                    </div>
                    <p className="mt-0.5 text-[12.5px] font-bold leading-snug">{event.title}</p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-soft">{event.description}</p>
                  </li>
                ))}
            </ol>
          )}
        </div>
      </div>

      {comparison && comparison.keyDifferences.length > 0 ? (
        <div className="panel mt-3 p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-soft">
            {t('world.keyDifferences')}
          </h3>
          <ul className="list-disc space-y-1 pl-4 text-[12px] leading-relaxed text-soft">
            {comparison.keyDifferences.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {comparison && comparison.changedAreas.length > 0 ? (
        <div className="panel mt-3 p-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-soft">{t('world.changedAreas')}</h3>
          <div className="flex flex-wrap gap-1.5">
            {comparison.changedAreas.map((area) => (
              <span key={area} className="chip !cursor-default">
                {area}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
