import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { usePreferences, useTranslation } from '../../stores/preferences'
import { useSimulationStore } from '../../stores/simulationStore'
import type { Depth, EraId, HypothesisInput, ScopeId, StyleId } from '../../types/simulation'
import { hypothesisInputSchema } from '../../types/simulation'
import { generateRuleSimulation } from '../../engines/ruleEngine'
import { AiGenerationError, generateAiSimulation, type AiProgress } from '../../engines/aiEngine'
import { putSimulation } from '../../db/database'
import { UniverseHero } from '../../components/visual/UniverseHero'

const eraOptions: EraId[] = ['ancient', 'medieval', 'earlymodern', 'modern', 'custom']
const scopeOptions: ScopeId[] = [
  'global',
  'region',
  'economy',
  'technology',
  'politics',
  'society',
  'finance',
  'environment',
  'civilization',
  'custom',
]
const depthOptions: Depth[] = ['quick', 'standard', 'deep']
const styleOptions: StyleId[] = ['realist', 'scifi', 'dark', 'optimistic', 'economic', 'historical']

const eraDefaultYear: Record<Exclude<EraId, 'custom'>, number> = {
  ancient: -3000,
  medieval: 500,
  earlymodern: 1500,
  modern: 1990,
}

export interface HypothesisBuilderProps {
  initialHypothesis?: string
  /** When present the builder writes into this simulation via "What if again". */
  parentId?: string
  parentTitle?: string
  compact?: boolean
}

export function HypothesisBuilder({ initialHypothesis = '', parentId, parentTitle }: HypothesisBuilderProps) {
  const { t, lang, examples } = useTranslation()
  const ai = usePreferences((state) => state.ai)
  const navigate = useNavigate()
  const setCurrent = useSimulationStore((state) => state.setCurrent)
  const setStatus = useSimulationStore((state) => state.setStatus)
  const status = useSimulationStore((state) => state.status)
  const progress = useSimulationStore((state) => state.progress)
  const setProgress = useSimulationStore((state) => state.setProgress)
  const error = useSimulationStore((state) => state.error)
  const setError = useSimulationStore((state) => state.setError)

  const [hypothesis, setHypothesis] = useState(initialHypothesis)
  const [era, setEra] = useState<EraId>('modern')
  const [year, setYear] = useState<number>(eraDefaultYear.modern)
  const [scopes, setScopes] = useState<ScopeId[]>(['global'])
  const [customScope, setCustomScope] = useState('')
  const [region, setRegion] = useState('')
  const [depth, setDepth] = useState<Depth>('standard')
  const [style, setStyle] = useState<StyleId>('realist')
  const [validationError, setValidationError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const areaRef = useRef<HTMLTextAreaElement | null>(null)

  const running = status === 'running'

  // Adopt a new initial hypothesis (e.g. arriving from another route) without an
  // effect: compare during render, then adjust state only when it truly changed.
  const [adoptedInitial, setAdoptedInitial] = useState(initialHypothesis)
  if (initialHypothesis !== adoptedInitial) {
    setAdoptedInitial(initialHypothesis)
    if (initialHypothesis) setHypothesis(initialHypothesis)
  }

  // Auto-grow the textarea so long hypotheses stay readable on phones.
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
  }, [hypothesis])

  const aiReady = ai.mode === 'direct' ? Boolean(ai.apiKey.trim() && ai.model.trim()) : Boolean(ai.proxyUrl.trim())

  const buildInput = (): HypothesisInput | null => {
    const candidate = {
      hypothesis: hypothesis.trim(),
      era,
      startingYear: era === 'custom' ? year : eraDefaultYear[era as Exclude<EraId, 'custom'>],
      scopes,
      customScope: scopes.includes('custom') ? customScope.trim() : undefined,
      region: region.trim() || undefined,
      depth,
      style,
      language: lang,
    }
    const parsed = hypothesisInputSchema.safeParse(candidate)
    if (!parsed.success) {
      const first = parsed.error.issues[0]
      if (first?.path[0] === 'hypothesis') {
        setValidationError(
          first.message.includes('too short') ? t('builder.error.short') : t('builder.error.long'),
        )
      } else if (first?.path[0] === 'scopes') {
        setValidationError(t('builder.error.scope'))
      } else if (first?.path[0] === 'startingYear') {
        setValidationError(t('builder.error.year'))
      } else {
        setValidationError(first?.message ?? t('common.error'))
      }
      return null
    }
    if (scopes.includes('custom') && !customScope.trim()) {
      setValidationError(t('builder.error.custom'))
      return null
    }
    setValidationError(null)
    return parsed.data
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (running) return
    const input = buildInput()
    if (!input) return

    setError(null)
    setStatus('running')
    setProgress({ stage: 'outline', ratio: 0.02 })

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const simulation = aiReady
        ? await generateAiSimulation({
            config: ai,
            ctx: {
              hypothesis: input.hypothesis,
              year: input.startingYear,
              depth: input.depth,
              style: input.style,
              scopes: input.scopes,
              region: input.region,
              language: input.language,
            },
            signal: controller.signal,
            onProgress: (next: AiProgress) => setProgress(next),
          })
        : generateRuleSimulation(input.hypothesis, {
            language: input.language,
            year: input.startingYear,
            depth: input.depth,
            style: input.style,
            era: input.era,
            scopes: input.scopes,
            customScope: input.customScope,
            region: input.region,
          })

      const final = parentId
        ? {
            ...simulation,
            parentId,
            versionNote:
              lang === 'en'
                ? `Derived from “${parentTitle ?? parentId}”. Added condition: ${input.hypothesis}`
                : `由「${parentTitle ?? parentId}」派生。新增条件：${input.hypothesis}`,
          }
        : simulation

      await putSimulation(final)
      setCurrent(final)
      setStatus('done')
      setProgress(null)
      navigate(`/world/${final.id}`)
    } catch (caught) {
      if (caught instanceof AiGenerationError) {
        if (caught.code === 'cancelled') {
          setStatus('idle')
          setProgress(null)
          return
        }
        setError(t(`ai.error.${caught.code}`))
      } else {
        setError(t('ai.error.unknown'))
      }
      setStatus('error')
      setProgress(null)
    } finally {
      abortRef.current = null
    }
  }

  const handleCancel = () => {
    abortRef.current?.abort('cancelled')
  }

  const toggleScope = (scope: ScopeId) => {
    setScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    )
  }

  const suggestionLabels = useMemo(
    () => [...examples.slice(0, 5), lang === 'en' ? 'Hypothesis' : '假设'],
    [examples, lang],
  )

  const progressPercent = Math.round((progress?.ratio ?? 0) * 100)

  return (
    <form onSubmit={handleSubmit} className="panel relative overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-40">
        <UniverseHero labels={suggestionLabels} className="h-full w-full" />
      </div>

      <div className="relative">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-extrabold tracking-tight">{t('builder.title')}</h2>
          <span
            className={clsx(
              'rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-[0.1em] uppercase',
              aiReady
                ? 'border-[rgba(110,231,255,0.4)] text-[color:var(--color-plasma)]'
                : 'border-[var(--border)] text-dim',
            )}
            title={aiReady ? t('engine.ai') : t('engine.ruleNote')}
          >
            {aiReady ? t('engine.ai') : t('engine.rule')}
          </span>
        </div>
        <p className="mt-1 text-xs text-dim">{t('builder.subtitle')}</p>
        {parentId ? (
          <p className="mt-2 rounded-lg border border-[var(--border)] bg-[rgba(110,231,255,0.06)] px-3 py-2 text-[11px] text-soft">
            {t('world.parent')}: {parentTitle ?? parentId}
          </p>
        ) : null}

        <div className="mt-4">
          <label htmlFor="hypothesis" className="mb-1.5 block text-xs font-bold tracking-[0.08em] uppercase text-soft">
            {t('builder.hypothesis')}
          </label>
          <textarea
            id="hypothesis"
            ref={areaRef}
            className="field min-h-[92px] resize-none leading-relaxed"
            placeholder={t('builder.hypothesisPlaceholder')}
            value={hypothesis}
            maxLength={700}
            onChange={(event) => setHypothesis(event.target.value)}
            aria-describedby="hypothesis-hint"
            disabled={running}
          />
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-dim">
            <span id="hypothesis-hint">{t('builder.hypothesisHint')}</span>
            <span className={hypothesis.trim().length > 600 ? 'text-[color:var(--color-rose)]' : ''}>
              {hypothesis.trim().length}/600
            </span>
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestionLabels.slice(0, 6).map((example) => (
              <button
                key={example}
                type="button"
                className="chip"
                onClick={() => setHypothesis(example)}
                disabled={running}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Era + year */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <span className="mb-1.5 block text-xs font-bold tracking-[0.08em] uppercase text-soft">
              {t('builder.era')}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {eraOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={clsx('chip', era === option && 'chip-active')}
                  onClick={() => {
                    setEra(option)
                    if (option !== 'custom') setYear(eraDefaultYear[option])
                  }}
                  disabled={running}
                >
                  {t(`era.${option}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="start-year" className="mb-1.5 block text-xs font-bold tracking-[0.08em] uppercase text-soft">
              {t('builder.year')}
            </label>
            <input
              id="start-year"
              type="number"
              inputMode="numeric"
              className="field"
              value={year}
              min={-10000}
              max={3000}
              onChange={(event) => {
                setYear(Number(event.target.value))
                setEra('custom')
              }}
              disabled={running}
            />
            <p className="mt-1 text-[11px] text-dim">{t('builder.yearHint')}</p>
          </div>
        </div>

        {/* Scope */}
        <div className="mt-4">
          <span className="mb-1.5 block text-xs font-bold tracking-[0.08em] uppercase text-soft">
            {t('builder.scope')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {scopeOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={clsx('chip', scopes.includes(option) && 'chip-active')}
                onClick={() => toggleScope(option)}
                aria-pressed={scopes.includes(option)}
                disabled={running}
              >
                {t(`scope.${option}`)}
              </button>
            ))}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {scopes.includes('custom') ? (
              <input
                className="field"
                placeholder={t('builder.customScopePlaceholder')}
                value={customScope}
                maxLength={60}
                onChange={(event) => setCustomScope(event.target.value)}
                aria-label={t('builder.customScope')}
                disabled={running}
              />
            ) : null}
            {scopes.includes('region') ? (
              <input
                className="field"
                placeholder={t('builder.regionPlaceholder')}
                value={region}
                maxLength={60}
                onChange={(event) => setRegion(event.target.value)}
                aria-label={t('builder.region')}
                disabled={running}
              />
            ) : null}
          </div>
        </div>

        {/* Depth */}
        <div className="mt-4">
          <span className="mb-1.5 block text-xs font-bold tracking-[0.08em] uppercase text-soft">
            {t('builder.depth')}
          </span>
          <div className="grid gap-2 sm:grid-cols-3">
            {depthOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setDepth(option)}
                className={clsx(
                  'muted-card px-3 py-2.5 text-left transition',
                  depth === option
                    ? 'border-[rgba(110,231,255,0.55)] bg-[rgba(110,231,255,0.09)]'
                    : 'hover:border-[rgba(110,231,255,0.3)]',
                )}
                aria-pressed={depth === option}
                disabled={running}
              >
                <span className="block text-xs font-bold">{t(`depth.${option}`)}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-dim">{t(`depth.${option}d`)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div className="mt-4">
          <span className="mb-1.5 block text-xs font-bold tracking-[0.08em] uppercase text-soft">
            {t('builder.style')}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {styleOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={clsx('chip', style === option && 'chip-active')}
                onClick={() => setStyle(option)}
                aria-pressed={style === option}
                disabled={running}
              >
                {t(`style.${option}`)}
              </button>
            ))}
          </div>
        </div>

        {validationError ? (
          <p role="alert" className="mt-4 rounded-lg border border-[rgba(251,113,133,0.35)] bg-[rgba(251,113,133,0.1)] px-3 py-2 text-xs text-[color:var(--color-rose)]">
            {validationError}
          </p>
        ) : null}

        {error ? (
          <div role="alert" className="mt-4 rounded-lg border border-[rgba(251,113,133,0.35)] bg-[rgba(251,113,133,0.1)] px-3 py-2 text-xs text-[color:var(--color-rose)]">
            <p>{error}</p>
            <button type="button" className="mt-2 font-bold underline" onClick={() => setError(null)}>
              {t('common.close')}
            </button>
          </div>
        ) : null}

        {running ? (
          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[rgba(110,231,255,0.06)] px-3 py-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-soft">
              <span>{progress ? t(`ai.stage.${progress.stage}`) : t('builder.generating')}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#6ee7ff] to-[#a78bfa] transition-all"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="submit" className="btn btn-primary flex-1 sm:flex-none" disabled={running}>
            {running ? t('builder.generating') : parentId ? t('world.again') : t('builder.submit')}
          </button>
          {running ? (
            <button type="button" className="btn btn-danger" onClick={handleCancel}>
              {t('builder.cancel')}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setHypothesis('')
                setCustomScope('')
                setRegion('')
                setValidationError(null)
                setError(null)
              }}
            >
              {t('builder.reset')}
            </button>
          )}
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-dim">
          {aiReady ? `${t('ai.notice')} ${t('settings.aiKeyStored')}` : t('engine.ruleNote')}
        </p>
      </div>
    </form>
  )
}
