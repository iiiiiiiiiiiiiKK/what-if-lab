import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { useSimulationStore } from '../../stores/simulationStore'
import { useTranslation } from '../../stores/preferences'
import { getSimulation, putSimulation } from '../../db/database'
import { getExampleById } from '../../data/examples'
import type { Simulation, TimelineEvent } from '../../types/simulation'
import { TimelineExplorer, EventDetailPanel } from '../../features/timeline/TimelineExplorer'
import { WorldStatePanel } from '../../features/world-state/WorldStatePanel'
import { OutcomeLab } from '../../features/outcomes/OutcomeLab'
import { RealityComparison } from '../../features/reality-comparison/RealityComparison'
import { BranchPanel, BranchComparison } from '../../features/branches/BranchPanel'
import { createBranchFromEvent } from '../../engines/branchEngine'
import { formatYear } from '../../features/timeline/layout'
import { EmptyState, NatureTag } from '../../components/ui/Badges'

type Tab = 'timeline' | 'state' | 'outcomes' | 'reality' | 'branches'

export function WorldPage() {
  const { id } = useParams<{ id: string }>()
  const { t, lang } = useTranslation()
  const navigate = useNavigate()
  const current = useSimulationStore((state) => state.current)
  const setCurrent = useSimulationStore((state) => state.setCurrent)

  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [tab, setTab] = useState<Tab>('timeline')
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null)
  const [branchDraft, setBranchDraft] = useState<{ name: string; condition: string } | null>(null)
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle')
  const [shared, setShared] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!id) return
      setLoading(true)
      if (current && current.id === id) {
        setLoading(false)
        return
      }
      const example = getExampleById(id)
      if (example) {
        if (!cancelled) {
          setCurrent(example)
          setMissing(false)
          setLoading(false)
        }
        return
      }
      const stored = await getSimulation(id)
      if (cancelled) return
      if (stored) {
        const { sortKey: _sortKey, ...simulation } = stored
        setCurrent(simulation)
        setMissing(false)
      } else {
        setMissing(true)
      }
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [id, current, setCurrent])

  const simulation: Simulation | null = current && current.id === id ? current : null

  const handleSave = useCallback(async () => {
    if (!simulation) return
    const updated = { ...simulation, updatedAt: new Date().toISOString() }
    await putSimulation(updated)
    setCurrent(updated)
    setSaveState('saved')
    window.setTimeout(() => setSaveState('idle'), 2000)
  }, [simulation, setCurrent])

  const handleShare = useCallback(async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setShared(true)
      window.setTimeout(() => setShared(false), 2000)
    } catch {
      window.prompt(t('world.share'), url)
    }
  }, [t])

  const handleExport = useCallback(() => {
    if (!simulation) return
    const blob = new Blob(
      [
        JSON.stringify(
          { format: 'what-if-lab/export', version: 1, exportedAt: new Date().toISOString(), simulations: [simulation] },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${simulation.id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }, [simulation])

  const submitBranch = useCallback(async () => {
    if (!simulation || !selectedEvent || !branchDraft) return
    if (branchDraft.name.trim().length < 2 || branchDraft.condition.trim().length < 4) {
      setError(t('builder.error.short'))
      return
    }
    try {
      const next = createBranchFromEvent(
        simulation,
        {
          originEventId: selectedEvent.id,
          condition: branchDraft.condition.trim(),
          name: branchDraft.name.trim(),
        },
        lang,
      )
      await putSimulation(next)
      setCurrent(next)
      setBranchDraft(null)
      setError(null)
      setTab('branches')
    } catch {
      setError(t('common.error'))
    }
  }, [simulation, selectedEvent, branchDraft, lang, setCurrent, t])

  const stats = useMemo(() => {
    if (!simulation) return null
    return {
      events: simulation.events.length,
      branches: simulation.branches.length,
      outcomes: simulation.outcomes.length,
    }
  }, [simulation])

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-dim">{t('common.loading')}</div>
  }

  if (missing || !simulation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          title={t('common.notFound')}
          body={t('library.empty')}
          action={
            <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
              {t('common.backHome')}
            </button>
          }
        />
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'timeline', label: t('world.tab.timeline') },
    { key: 'state', label: t('world.tab.state') },
    { key: 'outcomes', label: t('world.tab.outcomes') },
    { key: 'reality', label: t('world.tab.reality') },
    { key: 'branches', label: t('world.tab.branches') },
  ]

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-5 sm:px-6">
      {/* Header */}
      <header className="panel p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="tag tag-inference">{t(`engine.${simulation.engine}`)}</span>
              {simulation.parentId ? <span className="tag tag-fiction">{t('world.again')}</span> : null}
            </div>
            <h1 className="mt-2 text-balance text-xl font-black leading-tight sm:text-2xl">{simulation.title}</h1>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-soft">{simulation.hypothesis}</p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button type="button" className="btn btn-soft !min-h-9 !px-3 !text-[11px]" onClick={handleSave}>
              {saveState === 'saved' ? t('world.saved') : t('world.save')}
            </button>
            <button type="button" className="btn btn-ghost !min-h-9 !px-3 !text-[11px]" onClick={handleShare}>
              {shared ? t('world.shared') : t('world.share')}
            </button>
            <button type="button" className="btn btn-ghost !min-h-9 !px-3 !text-[11px]" onClick={handleExport}>
              {t('world.export')}
            </button>
            <button
              type="button"
              className="btn btn-primary !min-h-9 !px-3 !text-[11px]"
              onClick={() => navigate(`/lab?parent=${simulation.id}&hypothesis=${encodeURIComponent(simulation.hypothesis)}`)}
            >
              {t('world.again')}
            </button>
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 text-[11px] sm:grid-cols-4 lg:grid-cols-6">
          <Meta label={t('world.start')} value={formatYear(simulation.startingYear, lang)} />
          <Meta label={t('world.scope')} value={simulation.scopes.map((scope) => t(`scope.${scope}`)).join(' · ')} />
          <Meta label={t('world.depth')} value={t(`depth.${simulation.depth}`)} />
          <Meta label={t('world.style')} value={t(`style.${simulation.style}`)} />
          <Meta label={t('home.events')} value={String(stats?.events ?? 0)} />
          <Meta label={t('home.branches')} value={`${stats?.branches ?? 0} · ${stats?.outcomes ?? 0}`} />
        </dl>
      </header>

      {/* Divergence + assumptions */}
      <section className="mt-3 grid gap-3 lg:grid-cols-3">
        <div className="panel p-4 lg:col-span-2">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-dim">{t('world.divergence')}</h2>
          <p className="mt-1.5 text-[12.5px] leading-relaxed">{simulation.divergencePoint}</p>
          {simulation.engineNote ? (
            <p className="mt-2.5 rounded-lg border border-[var(--border)] px-2.5 py-2 text-[11px] leading-relaxed text-dim">
              <span className="font-bold text-soft">{t('world.engineNote')}: </span>
              {simulation.engineNote}
            </p>
          ) : null}
          {simulation.versionNote ? (
            <p className="mt-2 text-[11px] text-dim">
              <span className="font-bold text-soft">{t('world.versionNote')}: </span>
              {simulation.versionNote}
            </p>
          ) : null}
        </div>
        <div className="panel p-4">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-dim">{t('world.assumptions')}</h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11.5px] leading-relaxed text-soft">
            {simulation.assumptions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Tabs */}
      <div className="scroll-thin mt-5 flex gap-1 overflow-x-auto border-b border-[var(--border)] pb-px">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={clsx(
              'shrink-0 rounded-t-lg border-b-2 px-3 py-2.5 text-[12px] font-bold transition',
              tab === item.key
                ? 'border-[color:var(--color-plasma)] text-[color:var(--color-plasma)]'
                : 'border-transparent text-dim hover:text-[var(--text)]',
            )}
            aria-selected={tab === item.key}
            role="tab"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {tab === 'timeline' ? (
            <div className="panel p-3 sm:p-4">
              <TimelineExplorer
                simulation={simulation}
                activeBranchId={activeBranchId}
                onSelectEvent={setSelectedEvent}
                selectedEventId={selectedEvent?.id ?? null}
              />
            </div>
          ) : null}
          {tab === 'state' ? <WorldStatePanel simulation={simulation} /> : null}
          {tab === 'outcomes' ? <OutcomeLab simulation={simulation} /> : null}
          {tab === 'reality' ? <RealityComparison simulation={simulation} /> : null}
          {tab === 'branches' ? (
            <>
              <div className="panel p-4">
                <BranchPanel
                  simulation={simulation}
                  activeBranchId={activeBranchId}
                  onActivate={(branchId) => {
                    setActiveBranchId(branchId)
                    setTab('timeline')
                  }}
                  onCompare={(ids) => setCompareIds(ids)}
                />
              </div>
              {compareIds ? (
                <BranchComparison simulation={simulation} ids={compareIds} onClose={() => setCompareIds(null)} />
              ) : null}
            </>
          ) : null}

          {tab === 'timeline' ? (
            <div className="panel mt-3 p-4">
              <h2 className="text-[10px] font-bold uppercase tracking-[0.12em] text-dim">{t('world.uncertainties')}</h2>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11.5px] leading-relaxed text-soft">
                {simulation.uncertainties.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* Side panel */}
        <aside className="space-y-3">
          {selectedEvent ? (
            branchDraft ? (
              <div className="panel p-4">
                <h3 className="text-[12px] font-bold">{t('world.create')}</h3>
                <p className="mt-1 text-[11px] text-dim">
                  {formatYear(selectedEvent.year, lang)} · {selectedEvent.title}
                </p>
                <label className="mt-3 block text-[10px] font-bold uppercase tracking-[0.1em] text-dim" htmlFor="branch-name">
                  {t('world.branchName')}
                </label>
                <input
                  id="branch-name"
                  className="field mt-1"
                  placeholder={t('world.branchNamePlaceholder')}
                  value={branchDraft.name}
                  maxLength={80}
                  onChange={(event) => setBranchDraft({ ...branchDraft, name: event.target.value })}
                />
                <label className="mt-2.5 block text-[10px] font-bold uppercase tracking-[0.1em] text-dim" htmlFor="branch-cond">
                  {t('world.branchCondition')}
                </label>
                <textarea
                  id="branch-cond"
                  className="field mt-1 min-h-[76px] resize-none"
                  placeholder={t('world.branchConditionPlaceholder')}
                  value={branchDraft.condition}
                  maxLength={400}
                  onChange={(event) => setBranchDraft({ ...branchDraft, condition: event.target.value })}
                />
                {error ? <p className="mt-2 text-[11px] text-[color:var(--color-rose)]">{error}</p> : null}
                <div className="mt-3 flex gap-2">
                  <button type="button" className="btn btn-primary flex-1 !text-[12px]" onClick={submitBranch}>
                    {t('world.create')}
                  </button>
                  <button type="button" className="btn btn-ghost !text-[12px]" onClick={() => setBranchDraft(null)}>
                    {t('common.cancel')}
                  </button>
                </div>
                <p className="mt-2 text-[10.5px] leading-relaxed text-dim">{t('world.mainLine')} · 100%</p>
              </div>
            ) : (
              <EventDetailPanel
                event={selectedEvent}
                simulation={simulation}
                onClose={() => setSelectedEvent(null)}
                onBranch={() => setBranchDraft({ name: '', condition: '' })}
              />
            )
          ) : (
            <div className="panel p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-dim">{t('world.mainLine')}</h3>
              <ul className="mt-2 space-y-1.5">
                {simulation.events
                  .filter((event) => event.branchId === simulation.branches[0]?.id)
                  .sort((a, b) => a.year - b.year)
                  .slice(0, 8)
                  .map((event) => (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedEvent(event)}
                        className="w-full rounded-lg border border-[var(--border)] px-2.5 py-2 text-left transition hover:border-[rgba(110,231,255,0.4)]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[9.5px] text-dim">{formatYear(event.year, lang)}</span>
                          <NatureTag nature={event.nature} />
                        </div>
                        <p className="mt-0.5 text-[11.5px] font-semibold leading-snug">{event.title}</p>
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <div className="panel p-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.12em] text-dim">{t('world.branches')}</h3>
            <ul className="mt-2 space-y-1">
              {simulation.branches.map((branch) => (
                <li key={branch.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveBranchId(activeBranchId === branch.id ? null : branch.id)
                      setTab('timeline')
                    }}
                    className={clsx(
                      'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[11.5px] transition',
                      activeBranchId === branch.id
                        ? 'bg-[rgba(110,231,255,0.1)] text-[var(--text)]'
                        : 'text-soft hover:bg-[rgba(255,255,255,0.04)]',
                    )}
                  >
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: branch.color }} aria-hidden />
                    <span className="truncate">{branch.name}</span>
                  </button>
                </li>
              ))}
            </ul>
            {activeBranchId ? (
              <button
                type="button"
                className="btn btn-ghost mt-2 w-full !min-h-8 !text-[11px]"
                onClick={() => setActiveBranchId(null)}
              >
                {t('world.back')}
              </button>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[9px] font-bold uppercase tracking-[0.1em] text-dim">{label}</dt>
      <dd className="truncate font-semibold">{value}</dd>
    </div>
  )
}
