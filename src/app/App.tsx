import { Route, Routes } from 'react-router-dom'
import { AppFooter, AppHeader } from '../components/layout/AppShell'
import { ErrorBoundary } from '../components/layout/ErrorBoundary'
import { ThemeSync } from '../components/layout/ThemeSync'
import { HomePage } from './pages/HomePage'
import { LabPage } from './pages/LabPage'
import { WorldPage } from './pages/WorldPage'
import { LibraryPage } from './pages/LibraryPage'
import { CommunityPage } from './pages/CommunityPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'

function CrashFallback() {
  return (
    <div className="app-shell flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-lg font-bold">出错了 / Something went wrong</p>
      <p className="max-w-sm text-xs text-[color:var(--text-soft)]">
        界面渲染出现异常，已捕获并阻止白屏。 A rendering error was caught instead of a blank screen.
      </p>
      <button type="button" className="btn btn-primary mt-2" onClick={() => window.location.reload()}>
        刷新页面 / Reload
      </button>
    </div>
  )
}

export function App() {
  return (
    <div className="app-shell grid-veil relative">
      <ThemeSync />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <AppHeader />
        <main className="flex-1">
          <ErrorBoundary fallback={<CrashFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/lab" element={<LabPage />} />
              <Route path="/world/:id" element={<WorldPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ErrorBoundary>
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
