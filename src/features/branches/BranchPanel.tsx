import { useState } from 'react'
import clsx from 'clsx'
import type { Simulation } from '../../types/simulation'
import { useTranslation } from '../../stores/preferences'
import { SectionTitle } from '../../components/ui/Badges'
import { formatYear } from '../timeline/layout'

export function BranchPanel({
  simulation,
  activeBranchId,
  onActivate,
  onCompare,
}: {
  simulation: Simulation
  activeBranchId: string | null
  onActivate: (branchId: string | null) => void
  onCompare: (ids: [string, string]) => void
}) {
  const { t, lang } = useTranslation()
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (branchId: string) => {
    setSelected((current) => {
      if (current.includes(branchId)) return current.filter((item) => item !== branchId)
      const next = [...current, branchId].slice(-2)
      return next
    })
  }

  return (
    <section>
      <SectionTitle hint={t('world.selectTwo')}>{t('world.simulatedWorlds')}</SectionTitle>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {simulation.branches.map((branch) => {
          const count = simulation.events.filter((event) => event.branchId === branch.id).length
          const isActive = activeBranchId === branch.id
          const checked = selected.includes(branch.id)
          return (
            <article
              key={branch.id}
              className={clsx(
                'panel p-3.5 transition',
                isActive ? 'ring-1 ring-[rgba(110,231,255,0.55)]' : '',
                checked ? 'border-[rgba(167,139,250,0.55)]' : '',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="flex items-center gap-1.5 text-[13px] font-bold leading-snug">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: branch.color }} aria-hidden />
                    <span className="truncate">{branch.name}</span>
                  </h3>
                  <p className="mt-1 text-[11px] text-dim">
                    {t('world.start')}: {formatYear(branch.originYear, lang)} · {count} {t('world.events')}
                  </p>
                </div>
                {branch.isMain ? <span className="tag tag-inference">{t('world.mainLine')}</span> : null}
              </div>

              <p className="mt-2 text-[11.5px] leading-relaxed text-soft">{branch.condition}</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{branch.summary}</p>

              <div className="mt-3 flex items-center gap-1.5">
                <button
                  type="button"
                  className={clsx('btn !min-h-9 !px-2.5 !text-[11px]', isActive ? 'btn-soft' : 'btn-ghost')}
                  onClick={() => onActivate(isActive ? null : branch.id)}
                >
                  {isActive ? t('world.back') : t('world.selectBranch')}
                </button>
                <button
                  type="button"
                  className={clsx('btn !min-h-9 !px-2.5 !text-[11px]', checked ? 'btn-soft' : 'btn-ghost')}
                  onClick={() => toggle(branch.id)}
                  aria-pressed={checked}
                >
                  {t('library.compare')}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-soft !text-[12px]"
          disabled={selected.length !== 2}
          onClick={() => onCompare([selected[0], selected[1]])}
        >
          {t('world.compareWorlds')}
        </button>
        <span className="text-[11px] text-dim">{selected.length}/2</span>
      </div>
    </section>
  )
}

export function BranchComparison({
  simulation,
  ids,
  onClose,
}: {
  simulation: Simulation
  ids: [string, string]
  onClose: () => void
}) {
  const { t, lang } = useTranslation()
  const left = simulation.branches.find((branch) => branch.id === ids[0])
  const right = simulation.branches.find((branch) => branch.id === ids[1])
  if (!left || !right) return null

  const leftEvents = simulation.events.filter((event) => event.branchId === left.id).sort((a, b) => a.year - b.year)
  const rightEvents = simulation.events.filter((event) => event.branchId === right.id).sort((a, b) => a.year - b.year)

  return (
    <div className="panel mt-3 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-soft">{t('world.compareWorlds')}</h3>
        <button type="button" className="btn btn-ghost !min-h-8 !px-2" onClick={onClose} aria-label={t('common.close')}>
          ✕
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[left, right].map((branch, side) => (
          <div key={branch.id} className="muted-card p-3">
            <h4 className="flex items-center gap-1.5 text-[12.5px] font-bold">
              <span className="h-2 w-2 rounded-full" style={{ background: branch.color }} aria-hidden />
              {branch.name}
            </h4>
            <p className="mt-1 text-[11px] text-dim">{formatYear(branch.originYear, lang)}</p>
            <ul className="mt-2 space-y-1.5 text-[11.5px] text-soft">
              {(side === 0 ? leftEvents : rightEvents).slice(0, 8).map((event) => (
                <li key={event.id} className="flex gap-1.5">
                  <span className="font-mono text-[10px] text-dim">{formatYear(event.year, lang)}</span>
                  <span className="truncate">{event.title}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-dim">
              {side === 0 ? leftEvents.length : rightEvents.length} {t('world.events')}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
