import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from '../../stores/preferences'
import { getExamples } from '../../data/examples'
import { UniverseHero } from '../../components/visual/UniverseHero'
import { HypothesisBuilder } from '../../features/hypothesis/HypothesisBuilder'
import { listSimulations } from '../../db/database'
import type { StoredSimulation } from '../../db/database'
import { formatYear } from '../../features/timeline/layout'
import { SectionTitle } from '../../components/ui/Badges'

export function HomePage() {
  const { t, lang, examples } = useTranslation()
  const navigate = useNavigate()
  const [library, setLibrary] = useState<StoredSimulation[]>([])

  useEffect(() => {
    let cancelled = false
    void listSimulations().then((rows) => {
      if (!cancelled) setLibrary(rows.slice(0, 3))
    })
    return () => {
      cancelled = true
    }
  }, [])

  const featured = useMemo(() => getExamples(lang).slice(0, 6), [lang])

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] px-5 py-10 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <UniverseHero
            labels={examples.slice(0, 5)}
            className="h-full w-full"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[color:var(--bg)] via-[color:var(--bg)]/80 to-transparent" />

        <div className="relative max-w-2xl">
          <p className="font-mono text-[10px] font-bold tracking-[0.32em] text-[color:var(--color-plasma)]">
            {t('app.slogan')}
          </p>
          <h1 className="mt-3 font-black leading-[0.92] tracking-tight">
            <span className="block bg-gradient-to-br from-[#6ee7ff] via-[#a78bfa] to-[#f59e0b] bg-clip-text text-[clamp(2.9rem,11vw,6.5rem)] text-transparent">
              WHAT IF?
            </span>
          </h1>
          <p className="mt-3 text-balance text-[13px] font-semibold text-soft sm:text-base">
            {t('home.heroSub')}
          </p>
          <p className="text-balance text-[13px] text-dim sm:text-sm">{t('home.heroSubZh')}</p>

          <div className="mt-6 flex flex-wrap gap-2">
            <a href="#builder" className="btn btn-primary">
              {t('home.start')}
            </a>
            <Link to="/lab" className="btn btn-ghost">
              {t('nav.lab')}
            </Link>
            <Link to="/library" className="btn btn-ghost">
              {t('nav.library')}
            </Link>
          </div>

          <p className="mt-5 max-w-xl text-[11px] leading-relaxed text-dim">{t('home.disclaimer')}</p>
        </div>
      </section>

      {/* Builder */}
      <section id="builder" className="mt-8 scroll-mt-24">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <HypothesisBuilder />

          <aside className="space-y-3">
            <div className="panel p-4">
              <SectionTitle>{t('home.howItWorks')}</SectionTitle>
              <ol className="space-y-3">
                {[
                  ['1', t('home.step1'), t('home.step1d')],
                  ['2', t('home.step2'), t('home.step2d')],
                  ['3', t('home.step3'), t('home.step3d')],
                  ['4', t('home.step4'), t('home.step4d')],
                ].map(([index, title, body]) => (
                  <li key={index} className="flex gap-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[var(--border)] font-mono text-[10px] font-bold text-[color:var(--color-plasma)]">
                      {index}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold leading-snug">{title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-dim">{body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {library.length > 0 ? (
              <div className="panel p-4">
                <SectionTitle
                  action={
                    <Link to="/library" className="text-[11px] font-semibold text-[color:var(--color-plasma)] hover:underline">
                      {t('nav.library')}
                    </Link>
                  }
                >
                  {t('library.title')}
                </SectionTitle>
                <ul className="space-y-2">
                  {library.map((simulation) => (
                    <li key={simulation.id}>
                      <button
                        type="button"
                        onClick={() => navigate(`/world/${simulation.id}`)}
                        className="w-full rounded-lg border border-[var(--border)] px-2.5 py-2 text-left transition hover:border-[rgba(110,231,255,0.4)]"
                      >
                        <p className="truncate text-[12px] font-bold">{simulation.title}</p>
                        <p className="truncate text-[10.5px] text-dim">{simulation.hypothesis}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {/* Examples */}
      <section className="mt-10">
        <SectionTitle hint={t('home.examplesHint')}>{t('home.examples')}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((example) => (
            <article key={example.id} className="panel flex flex-col p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="tag tag-inference">{t('library.example')}</span>
                <span className="font-mono text-[10px] text-dim">{formatYear(example.startingYear, lang)}</span>
              </div>
              <h3 className="mt-2 text-[14px] font-extrabold leading-snug">{example.title}</h3>
              <p className="mt-1 line-clamp-3 flex-1 text-[11.5px] leading-relaxed text-dim">{example.hypothesis}</p>
              <dl className="mt-3 grid grid-cols-3 gap-1 border-t border-[var(--border)] pt-2.5 text-center">
                <div>
                  <dt className="text-[9px] uppercase tracking-[0.08em] text-dim">{t('home.events')}</dt>
                  <dd className="font-mono text-[13px] font-bold">{example.events.length}</dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-[0.08em] text-dim">{t('home.branches')}</dt>
                  <dd className="font-mono text-[13px] font-bold">{example.branches.length}</dd>
                </div>
                <div>
                  <dt className="text-[9px] uppercase tracking-[0.08em] text-dim">{t('home.outcomes')}</dt>
                  <dd className="font-mono text-[13px] font-bold">{example.outcomes.length}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => navigate(`/world/${example.id}`)}
                className="btn btn-soft mt-3 w-full !text-[12px]"
              >
                {t('home.openExample')}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
