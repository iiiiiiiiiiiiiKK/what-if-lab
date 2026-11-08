import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from '../../stores/preferences'
import { HypothesisBuilder } from '../../features/hypothesis/HypothesisBuilder'
import { getSimulation } from '../../db/database'
import { getExamples } from '../../data/examples'
import { SectionTitle } from '../../components/ui/Badges'

export function LabPage() {
  const { t, lang } = useTranslation()
  const [params] = useSearchParams()
  const parentId = params.get('parent') ?? undefined
  const [initialHypothesis, setInitialHypothesis] = useState(params.get('hypothesis') ?? '')
  const [parentTitle, setParentTitle] = useState<string | undefined>(undefined)

  useEffect(() => {
    let cancelled = false
    if (!parentId) return undefined
    const load = async () => {
      const stored = await getSimulation(parentId)
      if (cancelled) return
      if (stored) {
        setParentTitle(stored.title)
        setInitialHypothesis((current) => current || stored.hypothesis)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [parentId])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-5">
        <p className="font-mono text-[10px] font-bold tracking-[0.3em] text-[color:var(--color-plasma)]">
          {t('app.slogan')}
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{t('builder.title')}</h1>
        <p className="mt-1 text-[12.5px] text-soft">{t('builder.subtitle')}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <HypothesisBuilder
          initialHypothesis={initialHypothesis}
          parentId={parentId}
          parentTitle={parentTitle}
        />

        <aside className="space-y-3">
          <div className="panel p-4">
            <SectionTitle>{t('home.howItWorks')}</SectionTitle>
            <ol className="space-y-2.5 text-[11.5px] leading-relaxed text-soft">
              <li>1. {t('home.step1d')}</li>
              <li>2. {t('home.step2d')}</li>
              <li>3. {t('home.step3d')}</li>
              <li>4. {t('home.step4d')}</li>
            </ol>
          </div>

          <div className="panel p-4">
            <SectionTitle>{t('world.legend')}</SectionTitle>
            <ul className="space-y-2 text-[11px] leading-relaxed text-soft">
              <li>
                <span className="tag tag-fact">FACT</span>
                <span className="ml-1.5">{t('nature.FACT.d')}</span>
              </li>
              <li>
                <span className="tag tag-inference">INFERENCE</span>
                <span className="ml-1.5">{t('nature.INFERENCE.d')}</span>
              </li>
              <li>
                <span className="tag tag-fiction">FICTION</span>
                <span className="ml-1.5">{t('nature.FICTION.d')}</span>
              </li>
            </ul>
          </div>

          <div className="panel p-4">
            <SectionTitle>{t('home.quickStart')}</SectionTitle>
            <div className="flex flex-wrap gap-1.5">
              {getExamples(lang)
                .slice(0, 4)
                .map((example) => (
                  <button
                    key={example.id}
                    type="button"
                    className="chip !text-[11px]"
                    onClick={() => setInitialHypothesis(example.hypothesis)}
                  >
                    {example.hypothesis.slice(0, 22)}…
                  </button>
                ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
