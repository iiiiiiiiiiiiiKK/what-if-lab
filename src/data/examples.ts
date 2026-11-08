import type { Simulation } from '../types/simulation'
import { generateRuleSimulation } from '../engines/ruleEngine'

interface ExampleSeed {
  key: string
  zh: string
  en: string
  year: number
  era: Simulation['era']
  scopes: Simulation['scopes']
  style: Simulation['style']
}

const seeds: ExampleSeed[] = [
  {
    key: 'bitcoin',
    zh: '如果比特币从未诞生？',
    en: 'What if Bitcoin had never been invented?',
    year: 2008,
    era: 'modern',
    scopes: ['global', 'finance', 'technology'],
    style: 'realist',
  },
  {
    key: 'internet',
    zh: '如果互联网晚 20 年出现？',
    en: 'What if the internet had arrived 20 years later?',
    year: 1989,
    era: 'modern',
    scopes: ['global', 'technology', 'society'],
    style: 'historical',
  },
  {
    key: 'dinosaurs',
    zh: '如果恐龙没有灭绝？',
    en: 'What if the dinosaurs had never gone extinct?',
    year: -66000000,
    era: 'ancient',
    scopes: ['global', 'environment', 'civilization'],
    style: 'scifi',
  },
  {
    key: 'oil',
    zh: '如果人类从未发现石油？',
    en: 'What if humanity had never discovered petroleum?',
    year: 1859,
    era: 'earlymodern',
    scopes: ['global', 'economy', 'environment'],
    style: 'economic',
  },
  {
    key: 'rome',
    zh: '如果罗马帝国从未衰落？',
    en: 'What if the Roman Empire had never fallen?',
    year: 476,
    era: 'medieval',
    scopes: ['region', 'politics', 'civilization'],
    style: 'historical',
  },
  {
    key: 'ai',
    zh: '如果 AI 提前 100 年诞生？',
    en: 'What if AI had arrived 100 years earlier?',
    year: 1920,
    era: 'modern',
    scopes: ['global', 'technology', 'society'],
    style: 'scifi',
  },
  {
    key: 'dollar',
    zh: '如果全球从未采用美元作为主要储备货币？',
    en: 'What if the world had never adopted the dollar as its reserve currency?',
    year: 1944,
    era: 'modern',
    scopes: ['global', 'finance', 'economy'],
    style: 'economic',
  },
  {
    key: 'space',
    zh: '如果人类能够在 1900 年实现商业化太空旅行？',
    en: 'What if commercial space travel had begun in 1900?',
    year: 1900,
    era: 'modern',
    scopes: ['global', 'technology', 'civilization'],
    style: 'optimistic',
  },
  {
    key: 'moon',
    zh: '如果地球没有月亮？',
    en: 'What if Earth had no moon?',
    year: -4500000000,
    era: 'ancient',
    scopes: ['global', 'environment'],
    style: 'realist',
  },
]

const createdAt = '2026-01-01T00:00:00.000Z'

export const exampleSimulations: Record<'zh' | 'en', Simulation[]> = {
  zh: seeds.map((seed, index) => ({
    ...generateRuleSimulation(
      seed.zh,
      {
        language: 'zh',
        year: seed.year,
        depth: 'deep',
        style: seed.style,
        era: seed.era,
        scopes: seed.scopes,
      },
      { idPrefix: `ex_${seed.key}`, createdAt: new Date(Date.parse(createdAt) + index * 86400000).toISOString() },
    ),
    isExample: true,
    engine: 'example',
    engineNote: '内置示例模拟：用于展示推演结构，不代表真实历史研究结论。',
  })),
  en: seeds.map((seed, index) => ({
    ...generateRuleSimulation(
      seed.en,
      {
        language: 'en',
        year: seed.year,
        depth: 'deep',
        style: seed.style,
        era: seed.era,
        scopes: seed.scopes,
      },
      { idPrefix: `ex_${seed.key}`, createdAt: new Date(Date.parse(createdAt) + index * 86400000).toISOString() },
    ),
    isExample: true,
    engine: 'example',
    engineNote: 'Built-in example simulation: demonstrates the structure of a simulation, not a historical conclusion.',
  })),
}

export function getExamples(lang: 'zh' | 'en'): Simulation[] {
  return exampleSimulations[lang]
}

export function getExampleById(id: string): Simulation | undefined {
  return [...exampleSimulations.zh, ...exampleSimulations.en].find((simulation) => simulation.id === id)
}
