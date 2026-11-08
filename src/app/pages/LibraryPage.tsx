import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { useTranslation } from '../../stores/preferences'
import {
  clearAllSimulations,
  deleteSimulation,
  isMemoryFallback,
  listSimulations,
  putSimulation,
} from '../../db/database'
import type { StoredSimulation } from '../../db/database'
import { exportBundleSchema, simulationSchema } from '../../types/simulation'
import { newId } from '../../utils/id'
import { formatYear } from '../../features/timeline/layout'
import { EmptyState, SectionTitle } from '../../components/ui/Badges'

type SortKey = 'new' | 'old' | 'title'

export function LibraryPage() {
  const { t, lang } = useTranslation()
  const navigate = useNavigate()
  const [rows, setRows] = useState<StoredSimulation[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('new')
  const [message, setMessage] = useState<string | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    const list = await listSimulations()
    setRows(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    // IndexedDB is an external store: this effect synchronises the page with it.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh()
  }, [refresh])

  const filtered = useMemo(() => {
    const text = query.trim().toLowerCase()
    const list = text
      ? rows.filter(
          (row) => row.title.toLowerCase().includes(text) || row.hypothesis.toLowerCase().includes(text),
        )
      : rows
    const sorted = [...list]
    if (sort === 'new') sorted.sort((a, b) => b.sortKey - a.sortKey)
    if (sort === 'old') sorted.sort((a, b) => a.sortKey - b.sortKey)
    if (sort === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title))
    return sorted
  }, [rows, query, sort])

  const handleRename = async (row: StoredSimulation) => {
    const title = window.prompt(t('library.renamePrompt'), row.title)
    if (!title || !title.trim()) return
    const { sortKey: _sortKey, ...rest } = row
    const updated = { ...rest, title: title.trim(), updatedAt: new Date().toISOString() }
    await putSimulation(updated)
    await refresh()
    setMessage(t('common.saved'))
  }

  const handleDuplicate = async (row: StoredSimulation) => {
    const { sortKey: _sortKey, ...rest } = row
    const copy = {
      ...rest,
      id: newId('sim'),
      title: `${row.title} · ${lang === 'en' ? 'copy' : '副本'}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await putSimulation(copy)
    await refresh()
  }

  const handleDelete = async (row: StoredSimulation) => {
    if (!window.confirm(t('library.deleteConfirm'))) return
    await deleteSimulation(row.id)
    setSelected((current) => current.filter((id) => id !== row.id))
    await refresh()
  }

  const handleExportOne = (row: StoredSimulation) => {
    const { sortKey: _sortKey, ...rest } = row
    downloadJson(
      { format: 'what-if-lab/export', version: 1, exportedAt: new Date().toISOString(), simulations: [rest] },
      `${row.id}.json`,
    )
  }

  const handleExportAll = () => {
    if (rows.length === 0) return
    const simulations = rows.map((row) => {
      const { sortKey: _sortKey, ...rest } = row
      return rest
    })
    downloadJson(
      { format: 'what-if-lab/export', version: 1, exportedAt: new Date().toISOString(), simulations },
      `what-if-lab-library-${Date.now()}.json`,
    )
  }

  const handleImport = async (file: File) => {
    try {
      const text = await file.text()
      const parsedJson: unknown = JSON.parse(text)
      const bundle = exportBundleSchema.safeParse(parsedJson)
      let simulations
      if (bundle.success) {
        simulations = bundle.data.simulations
      } else {
        const single = simulationSchema.safeParse(parsedJson)
        if (!single.success) {
          setMessage(t('library.importError'))
          return
        }
        simulations = [single.data]
      }
      for (const simulation of simulations) {
        // Re-key on import so an imported file never overwrites a local world.
        await putSimulation({ ...simulation, id: newId('sim'), updatedAt: new Date().toISOString() })
      }
      await refresh()
      setMessage(`${t('library.imported')} · ${simulations.length}`)
    } catch {
      setMessage(t('library.importError'))
    }
  }

  const handleClearAll = async () => {
    if (!window.confirm(t('library.clearConfirm'))) return
    await clearAllSimulations()
    setSelected([])
    await refresh()
  }

  const comparePair = selected.length === 2 ? rows.filter((row) => selected.includes(row.id)) : null

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{t('library.title')}</h1>
          <p className="mt-1 text-[12px] text-soft">{t('library.subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className="btn btn-primary !min-h-9 !px-3 !text-[11px]" onClick={() => navigate('/lab')}>
            {t('library.new')}
          </button>
          <button
            type="button"
            className="btn btn-ghost !min-h-9 !px-3 !text-[11px]"
            onClick={() => fileRef.current?.click()}
          >
            {t('library.import')}
          </button>
          <button
            type="button"
            className="btn btn-ghost !min-h-9 !px-3 !text-[11px]"
            onClick={handleExportAll}
            disabled={rows.length === 0}
          >
            {t('library.exportAll')}
          </button>
          <button
            type="button"
            className="btn btn-danger !min-h-9 !px-3 !text-[11px]"
            onClick={handleClearAll}
            disabled={rows.length === 0}
          >
            {t('library.clearAll')}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleImport(file)
              event.target.value = ''
            }}
          />
        </div>
      </header>

      {isMemoryFallback() ? (
        <p className="mb-3 rounded-lg border border-[rgba(245,158,11,0.4)] bg-[rgba(245,158,11,0.1)] px-3 py-2 text-[11px] text-[color:var(--color-ember)]">
          {t('library.error.db')}
        </p>
      ) : null}

      {message ? (
        <p className="mb-3 rounded-lg border border-[var(--border)] px-3 py-2 text-[11px] text-soft">{message}</p>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          className="field max-w-xs !min-h-9 !py-1.5 !text-[12px]"
          placeholder={t('library.search')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={t('library.search')}
        />
        <select
          className="field w-auto !min-h-9 !py-1.5 !text-[12px]"
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          aria-label={t('library.sort')}
        >
          <option value="new">{t('library.sortNew')}</option>
          <option value="old">{t('library.sortOld')}</option>
          <option value="title">{t('library.sortTitle')}</option>
        </select>
        <span className="text-[11px] text-dim">
          {filtered.length} {t('library.count')}
        </span>
        {selected.length > 0 ? (
          <span className="text-[11px] text-[color:var(--color-plasma)]">
            {t('library.compare')} {selected.length}/2
          </span>
        ) : null}
      </div>

      {comparePair && comparePair.length === 2 ? (
        <div className="panel mb-4 p-4">
          <SectionTitle>{t('library.compare')}</SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2">
            {comparePair.map((row) => (
              <div key={row.id} className="muted-card p-3">
                <p className="text-[12.5px] font-bold">{row.title}</p>
                <p className="mt-0.5 text-[11px] text-dim">{row.hypothesis}</p>
                <dl className="mt-2 grid grid-cols-3 gap-1 text-center text-[10px] text-dim">
                  <div>
                    <dt>{t('home.events')}</dt>
                    <dd className="font-mono text-[12px] font-bold text-[var(--text)]">{row.events.length}</dd>
                  </div>
                  <div>
                    <dt>{t('home.branches')}</dt>
                    <dd className="font-mono text-[12px] font-bold text-[var(--text)]">{row.branches.length}</dd>
                  </div>
                  <div>
                    <dt>{t('home.outcomes')}</dt>
                    <dd className="font-mono text-[12px] font-bold text-[var(--text)]">{row.outcomes.length}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-dim">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t('library.empty')}
          body={t('library.subtitle')}
          action={
            <button type="button" className="btn btn-primary" onClick={() => navigate('/lab')}>
              {t('library.emptyCta')}
            </button>
          }
        />
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => {
            const checked = selected.includes(row.id)
            return (
              <li key={row.id} className={clsx('panel p-3.5', checked && 'border-[rgba(167,139,250,0.55)]')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className={clsx('tag', row.engine === 'ai' ? 'tag-fiction' : 'tag-inference')}>
                        {row.engine === 'ai' ? t('library.ai') : row.engine === 'example' ? t('library.example') : t('library.rule')}
                      </span>
                      {row.parentId ? <span className="tag tag-fiction">v+</span> : null}
                    </div>
                    <h3 className="mt-1.5 text-[13px] font-extrabold leading-snug">{row.title}</h3>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-dim">{row.hypothesis}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelected((current) =>
                        current.includes(row.id)
                          ? current.filter((id) => id !== row.id)
                          : [...current, row.id].slice(-2),
                      )
                    }
                    className="mt-0.5 h-4 w-4 accent-[#6ee7ff]"
                    aria-label={t('library.compare')}
                  />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-dim">
                  <span>{formatYear(row.startingYear, lang)}</span>
                  <span aria-hidden>·</span>
                  <span>
                    {row.events.length} {t('library.events')}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{t(`depth.${row.depth}`)}</span>
                </div>

                <div className="mt-2.5 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="btn btn-soft !min-h-8 !px-2 !text-[10.5px]"
                    onClick={() => navigate(`/world/${row.id}`)}
                  >
                    {t('library.open')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost !min-h-8 !px-2 !text-[10.5px]"
                    onClick={() => void handleRename(row)}
                  >
                    {t('library.rename')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost !min-h-8 !px-2 !text-[10.5px]"
                    onClick={() => void handleDuplicate(row)}
                  >
                    {t('library.duplicate')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost !min-h-8 !px-2 !text-[10.5px]"
                    onClick={() => handleExportOne(row)}
                  >
                    {t('library.export')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger !min-h-8 !px-2 !text-[10.5px]"
                    onClick={() => void handleDelete(row)}
                  >
                    {t('library.delete')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function downloadJson(payload: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
