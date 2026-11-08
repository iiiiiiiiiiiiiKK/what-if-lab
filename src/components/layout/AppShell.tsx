import { useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import clsx from 'clsx'
import { usePreferences, useTranslation } from '../../stores/preferences'

const AUTHOR_X_URL = 'https://x.com/0xkillcoin'

export function AuthorBadge({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  return (
    <a
      href={AUTHOR_X_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={clsx(
        'group inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-soft transition',
        'hover:border-[rgba(110,231,255,0.45)] hover:text-[color:var(--color-plasma)]',
      )}
      aria-label={t('author.x')}
      title={t('author.x')}
    >
      <span className="hidden sm:inline text-[10px] tracking-[0.12em] uppercase text-dim">{t('author.follow')}</span>
      <span className="text-sm leading-none" aria-hidden>
        𝕏
      </span>
      {compact ? <span className="truncate">0xkillcoin</span> : <span className="truncate">@0xkillcoin</span>}
    </a>
  )
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button type="button" onClick={onClick} className="btn btn-ghost !px-3 !min-w-11" aria-label={label} title={label}>
      {children}
    </button>
  )
}

export function AppHeader() {
  const { t, lang } = useTranslation()
  const theme = usePreferences((s) => s.theme)
  const toggleTheme = usePreferences((s) => s.toggleTheme)
  const toggleLang = usePreferences((s) => s.toggleLang)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  // Close the mobile sheet whenever the route changes (derived, not an effect).
  const [menuPath, setMenuPath] = useState(location.pathname)
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname)
    if (open) setOpen(false)
  }

  const links = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/lab', label: t('nav.lab') },
    { to: '/library', label: t('nav.library') },
    { to: '/community', label: t('nav.community') },
    { to: '/settings', label: t('nav.settings') },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[color:var(--bg)]/80 backdrop-blur-xl">
      {/* Row 1: brand + author X link (spec: author badge in the top bar). */}
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6ee7ff] to-[#a78bfa] text-[15px] font-black text-[#05060a]"
            aria-hidden
          >
            ?
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-extrabold tracking-[0.16em] uppercase">
              {t('app.name')}
            </span>
            <span className="hidden truncate text-[10px] tracking-[0.08em] text-dim sm:block">{t('app.slogan')}</span>
          </span>
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          <AuthorBadge />
          <IconButton label={lang === 'zh' ? 'Switch to English' : '切换到中文'} onClick={toggleLang}>
            <span className="text-[11px] font-bold">{lang === 'zh' ? 'EN' : '中'}</span>
          </IconButton>
          <IconButton label={theme === 'dark' ? t('settings.theme.light') : t('settings.theme.dark')} onClick={toggleTheme}>
            <span aria-hidden>{theme === 'dark' ? '☾' : '☀'}</span>
          </IconButton>
          <button
            type="button"
            className="btn btn-ghost !px-3 md:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            <span aria-hidden>{open ? '✕' : '☰'}</span>
          </button>
        </div>
      </div>

      {/* Row 2: desktop nav */}
      <nav className="mx-auto hidden w-full max-w-7xl gap-1 px-4 pb-2 sm:px-6 md:flex">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              clsx(
                'rounded-lg px-3 py-2 text-xs font-bold tracking-[0.06em] transition',
                isActive
                  ? 'bg-[rgba(110,231,255,0.12)] text-[color:var(--color-plasma)]'
                  : 'text-soft hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text)]',
              )
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      {/* Mobile sheet */}
      {open ? (
        <nav className="border-t border-[var(--border)] px-4 pb-3 pt-2 md:hidden">
          <div className="grid gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  clsx(
                    'flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold',
                    isActive
                      ? 'bg-[rgba(110,231,255,0.12)] text-[color:var(--color-plasma)]'
                      : 'text-soft',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  )
}

export function AppFooter() {
  const { t } = useTranslation()
  return (
    <footer className="mt-16 border-t border-[var(--border)] px-4 py-8 text-xs text-dim sm:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl leading-relaxed">
          {t('app.name')} · {t('app.slogan')} — {t('home.disclaimer')}
        </p>
        <div className="flex items-center gap-3">
          <a
            href={AUTHOR_X_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-soft hover:text-[color:var(--color-plasma)]"
          >
            <span aria-hidden>𝕏</span> @0xkillcoin
          </a>
          <span aria-hidden>·</span>
          <Link to="/settings" className="hover:text-[var(--text)]">
            {t('nav.settings')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
