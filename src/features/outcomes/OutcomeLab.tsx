import type { Simulation } from '../../types/simulation'
import { useTranslation } from '../../stores/preferences'
import { SectionTitle, UncertaintyBadge } from '../../components/ui/Badges'

export function OutcomeLab({ simulation }: { simulation: Simulation }) {
  const { t } = useTranslation()

  return (
    <section>
      <SectionTitle hint={t('world.selectTwo')}>{t('world.tab.outcomes')}</SectionTitle>
      <div className="grid gap-3 lg:grid-cols-2">
        {simulation.outcomes.map((outcome, index) => {
          const branch = simulation.branches.find((item) => item.id === outcome.branchId)
          return (
            <article
              key={outcome.id}
              className="panel relative overflow-hidden p-4"
              style={{ borderTopColor: branch?.color ?? '#6ee7ff', borderTopWidth: 2 }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[10px] tracking-[0.1em] text-dim">
                    {String.fromCharCode(65 + index)}
                  </p>
                  <h3 className="mt-0.5 text-[14px] font-extrabold leading-snug">{outcome.title}</h3>
                  {branch ? (
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-dim">
                      <span className="h-2 w-2 rounded-full" style={{ background: branch.color }} aria-hidden />
                      {branch.name}
                    </p>
                  ) : null}
                </div>
                <UncertaintyBadge uncertainty={outcome.uncertainty} />
              </div>

              <div className="mt-3 space-y-2.5 text-[12px] leading-relaxed">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-dim">
                    {t('world.outcomePath')}
                  </p>
                  <ol className="flex flex-wrap items-center gap-1.5">
                    {outcome.path.map((step, stepIndex) => (
                      <li key={step} className="inline-flex items-center gap-1.5">
                        <span className="rounded-md border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-2 py-0.5 text-[11px] text-soft">
                          {step}
                        </span>
                        {stepIndex < outcome.path.length - 1 ? (
                          <span className="text-dim" aria-hidden>
                            →
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>

                {outcome.keyConditions.length > 0 ? (
                  <BulletList title={t('world.keyConditions')} items={outcome.keyConditions} />
                ) : null}
                {outcome.mainImpacts.length > 0 ? (
                  <BulletList title={t('world.mainImpacts')} items={outcome.mainImpacts} />
                ) : null}
                {outcome.differsFrom.length > 0 ? (
                  <BulletList title={t('world.differs')} items={outcome.differsFrom} />
                ) : null}

                <div className="rounded-lg border border-[var(--border)] px-2.5 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-dim">
                    {t('world.uncertaintyReason')}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-soft">{outcome.uncertaintyReason}</p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-dim">{title}</p>
      <ul className="list-disc space-y-0.5 pl-4 text-soft">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
