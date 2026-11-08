import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Lang } from '../locales/dictionary'
import { dictionaries, exampleHypotheses } from '../locales/dictionary'

/** Persisted preferences only — simulation data lives in IndexedDB (Dexie). */
export interface AiConfig {
  mode: 'direct' | 'proxy'
  baseUrl: string
  apiKey: string
  model: string
  proxyUrl: string
}

interface PreferencesState {
  lang: Lang
  theme: 'dark' | 'light'
  ai: AiConfig
  setLang: (lang: Lang) => void
  toggleLang: () => void
  setTheme: (theme: 'dark' | 'light') => void
  toggleTheme: () => void
  setAi: (ai: Partial<AiConfig>) => void
  clearAi: () => void
}

export const defaultAiConfig: AiConfig = {
  mode: 'proxy',
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-4o-mini',
  // Empty by default: no AI service is configured, so the rule-based engine runs.
  proxyUrl: '',
}

export const usePreferences = create<PreferencesState>()(
  persist(
    (set) => ({
      lang: 'zh',
      theme: 'dark',
      ai: defaultAiConfig,
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((s) => ({ lang: s.lang === 'zh' ? 'en' : 'zh' })),
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setAi: (ai) => set((s) => ({ ai: { ...s.ai, ...ai } })),
      clearAi: () => set({ ai: { ...defaultAiConfig } }),
    }),
    {
      name: 'what-if-lab:preferences',
      version: 1,
      partialize: (state) => ({ lang: state.lang, theme: state.theme, ai: state.ai }),
    },
  ),
)

type Translate = (key: string) => string

export function useTranslation() {
  const lang = usePreferences((s) => s.lang)
  const t: Translate = (key) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key
  return { t, lang, examples: exampleHypotheses[lang] }
}
