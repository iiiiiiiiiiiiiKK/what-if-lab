import { useState } from 'react'
import clsx from 'clsx'
import { usePreferences, useTranslation } from '../../stores/preferences'
import { clearAllSimulations } from '../../db/database'
import { SectionTitle } from '../../components/ui/Badges'

export function SettingsPage() {
  const { t, lang } = useTranslation()
  const theme = usePreferences((state) => state.theme)
  const setTheme = usePreferences((state) => state.setTheme)
  const setLang = usePreferences((state) => state.setLang)
  const ai = usePreferences((state) => state.ai)
  const setAi = usePreferences((state) => state.setAi)
  const clearAi = usePreferences((state) => state.clearAi)

  const [baseUrl, setBaseUrl] = useState(ai.baseUrl)
  const [apiKey, setApiKey] = useState(ai.apiKey)
  const [model, setModel] = useState(ai.model)
  const [proxyUrl, setProxyUrl] = useState(ai.proxyUrl)
  const [mode, setMode] = useState(ai.mode)
  const [saved, setSaved] = useState(false)
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [cleared, setCleared] = useState(false)

  const handleSave = () => {
    setAi({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim(), model: model.trim(), proxyUrl: proxyUrl.trim(), mode })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2200)
  }

  const handleTest = async () => {
    setTestState('testing')
    try {
      if (mode === 'proxy') {
        const response = await fetch(proxyUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ probe: true }),
        })
        setTestState(response.ok || response.status === 400 || response.status === 405 ? 'ok' : 'fail')
      } else {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/models`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        })
        setTestState(response.ok ? 'ok' : 'fail')
      }
    } catch {
      setTestState('fail')
    }
  }

  const handleClearData = async () => {
    if (!window.confirm(t('library.clearConfirm'))) return
    await clearAllSimulations()
    setCleared(true)
    window.setTimeout(() => setCleared(false), 2200)
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-16 pt-6 sm:px-6">
      <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{t('settings.title')}</h1>

      {/* Appearance */}
      <section className="panel mt-5 p-4">
        <SectionTitle>{t('settings.appearance')}</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-dim">{t('settings.theme')}</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                className={clsx('chip', theme === 'dark' && 'chip-active')}
                onClick={() => setTheme('dark')}
                aria-pressed={theme === 'dark'}
              >
                ☾ {t('settings.theme.dark')}
              </button>
              <button
                type="button"
                className={clsx('chip', theme === 'light' && 'chip-active')}
                onClick={() => setTheme('light')}
                aria-pressed={theme === 'light'}
              >
                ☀ {t('settings.theme.light')}
              </button>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-dim">{t('settings.language')}</p>
            <div className="flex gap-1.5">
              <button
                type="button"
                className={clsx('chip', lang === 'zh' && 'chip-active')}
                onClick={() => setLang('zh')}
                aria-pressed={lang === 'zh'}
              >
                中文
              </button>
              <button
                type="button"
                className={clsx('chip', lang === 'en' && 'chip-active')}
                onClick={() => setLang('en')}
                aria-pressed={lang === 'en'}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* AI */}
      <section className="panel mt-4 p-4">
        <SectionTitle hint={t('settings.aiDesc')}>{t('settings.ai')}</SectionTitle>

        <div className="flex gap-1.5">
          <button
            type="button"
            className={clsx('chip', mode === 'proxy' && 'chip-active')}
            onClick={() => setMode('proxy')}
            aria-pressed={mode === 'proxy'}
          >
            {t('settings.aiProxyMode')}
          </button>
          <button
            type="button"
            className={clsx('chip', mode === 'direct' && 'chip-active')}
            onClick={() => setMode('direct')}
            aria-pressed={mode === 'direct'}
          >
            {t('settings.aiDirect')}
          </button>
        </div>

        {mode === 'proxy' ? (
          <div className="mt-3">
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-dim" htmlFor="proxy-url">
              {t('settings.aiProxy')}
            </label>
            <input
              id="proxy-url"
              className="field"
              value={proxyUrl}
              onChange={(event) => setProxyUrl(event.target.value)}
              placeholder="/api/simulate"
              autoComplete="off"
            />
            <p className="mt-1 text-[11px] leading-relaxed text-dim">{t('settings.aiProxyHint')}</p>
          </div>
        ) : (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-dim" htmlFor="base-url">
                {t('settings.aiBase')}
              </label>
              <input
                id="base-url"
                className="field"
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="https://api.openai.com/v1"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-dim" htmlFor="api-key">
                {t('settings.aiKey')}
              </label>
              <input
                id="api-key"
                type="password"
                className="field"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.1em] text-dim" htmlFor="model">
                {t('settings.aiModel')}
              </label>
              <input
                id="model"
                className="field"
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="gpt-4o-mini"
                autoComplete="off"
              />
            </div>
          </div>
        )}

        <p className="mt-2.5 rounded-lg border border-[rgba(245,158,11,0.35)] bg-[rgba(245,158,11,0.09)] px-3 py-2 text-[11px] leading-relaxed text-[color:var(--color-ember)]">
          {t('settings.aiWarning')}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <button type="button" className="btn btn-primary !min-h-9 !px-3 !text-[11.5px]" onClick={handleSave}>
            {saved ? t('settings.aiSaved') : t('settings.aiSave')}
          </button>
          <button type="button" className="btn btn-ghost !min-h-9 !px-3 !text-[11.5px]" onClick={handleTest}>
            {testState === 'testing'
              ? t('common.loading')
              : testState === 'ok'
                ? t('settings.aiTestOk')
                : testState === 'fail'
                  ? t('settings.aiTestFail')
                  : t('settings.aiTest')}
          </button>
          <button
            type="button"
            className="btn btn-ghost !min-h-9 !px-3 !text-[11.5px]"
            onClick={() => {
              clearAi()
              setApiKey('')
              setBaseUrl('https://api.openai.com/v1')
              setModel('gpt-4o-mini')
            }}
          >
            {t('settings.aiClear')}
          </button>
        </div>
      </section>

      {/* Data */}
      <section className="panel mt-4 p-4">
        <SectionTitle hint={t('settings.dataDesc')}>{t('settings.data')}</SectionTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className="btn btn-danger !min-h-9 !px-3 !text-[11.5px]" onClick={handleClearData}>
            {cleared ? t('common.saved') : t('library.clearAll')}
          </button>
        </div>
      </section>

      {/* About */}
      <section className="panel mt-4 p-4">
        <SectionTitle>{t('settings.about')}</SectionTitle>
        <p className="text-[12px] leading-relaxed text-soft">
          {t('app.name')} · {t('app.nameZh')} — {t('app.slogan')}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-dim">{t('home.disclaimer')}</p>
        <p className="mt-2 font-mono text-[10.5px] text-dim">
          {t('settings.version')}: 1.0.0 · {t('library.storage')}: IndexedDB
        </p>
        <a
          href="https://x.com/0xkillcoin"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-semibold text-[color:var(--color-plasma)] hover:underline"
        >
          <span aria-hidden>𝕏</span> @0xkillcoin
        </a>
      </section>
    </div>
  )
}
