import { useEffect } from 'react'
import { usePreferences } from '../../stores/preferences'

/** Applies the persisted theme class to <html> and keeps the browser tab colour in sync. */
export function ThemeSync() {
  const theme = usePreferences((state) => state.theme)
  const lang = usePreferences((state) => state.lang)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('light', theme === 'light')
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#05060a' : '#f5f7fc')
  }, [theme])

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN'
  }, [lang])

  return null
}
