import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from '../../stores/preferences'
import { getExamples } from '../../data/examples'
import { listSimulations } from '../../db/database'
import type { StoredSimulation } from '../../db/database'
import { formatYear } from '../../features/timeline/layout'
import { SectionTitle } from '../../components/ui/Badges'

export function CommunityPage() {
  const { t, lang } = useTranslation()
  const navigate = useNavigate()
  const [local, setLocal] = useState<StoredSimulation[]>([])
  const examples = getExamples(lang)

  useEffect(() => {
    let cancelled = false
    void listSimulations().then((rows) => {
      if (!cancelled) setLocal(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{t('community.title')}</h1>
        <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-soft">{t('community.subtitle')}</p>
      </header>

      <div className="panel mb-5 p-4">
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-[var(--border)] text-[13px]" aria-hidden>
            ⓘ
          </span>
          <div>
            <p className="text-[12.5px] font-bold">{t('community.noBackend')}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-dim">{t('community.noBackendBody')}</p>
            <p className="mt-2 text-[11px] text-dim">{t('community.publishDisabled')}</p>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <SectionTitle hint={t('home.examplesHint')}>{t('community.builtin')}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {examples.map((example) => (
            <article key={example.id} className="panel flex flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="tag tag-inference">{t('library.example')}</span>
                <span className="font-mono text-[10px] text-dim">{formatYear(example.startingYear, lang)}</span>
              </div>
              <h3 className="mt-2 text-[13.5px] font-extrabold leading-snug">{example.title}</h3>
              <p className="mt-1 line-clamp-3 flex-1 text-[11.5px] leading-relaxed text-dim">{example.hypothesis}</p>
              <p className="mt-2 text-[10.5px] text-dim">
                {example.events.length} {t('home.events')} · {example.branches.length} {t('home.branches')} ·{' '}
                {example.outcomes.length} {t('home.outcomes')}
              </p>
              <button
                type="button"
                className="btn btn-ghost mt-3 w-full !text-[11.5px]"
                onClick={() => navigate(`/world/${example.id}`)}
              >
                {t('home.openExample')}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>{t('community.local')}</SectionTitle>
        {local.length === 0 ? (
          <p className="text-[12px] text-dim">{t('library.empty')}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {local.map((row) => (
              <article key={row.id} className="panel flex flex-col p-4">
                <span className={row.engine === 'ai' ? 'tag tag-fiction' : 'tag tag-inference'}>
                  {row.engine === 'ai' ? t('library.ai') : t('library.rule')}
                </span>
                <h3 className="mt-2 text-[13px] font-extrabold leading-snug">{row.title}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-[11px] leading-relaxed text-dim">{row.hypothesis}</p>
                <button
                  type="button"
                  className="btn btn-ghost mt-3 w-full !text-[11.5px]"
                  onClick={() => navigate(`/world/${row.id}`)}
                >
                  {t('library.open')}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
