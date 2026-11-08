import type {
  Confidence,
  DomainId,
  Nature,
  Uncertainty,
  Direction,
} from '../../types/simulation'

/** A string in both supported languages. The engine only emits one of them. */
export interface L {
  zh: string
  en: string
}

export type Localize = <T>(value: L) => T extends string ? string : never

export const L = (zh: string, en: string): L => ({ zh, en })

export function loc(value: L, lang: 'zh' | 'en'): string {
  return lang === 'en' ? value.en : value.zh
}

export interface EventTemplate {
  /** Years after the divergence point. Negative values reach back before it. */
  dy: number
  title: L
  desc: L
  category: DomainId
  cause: L
  immediate: L[]
  longTerm: L[]
  affected: L[]
  confidence: Confidence
  nature: Nature
  /** Index into the same array; undefined means "caused by the divergence point". */
  parentIndex?: number
}

export interface BranchTemplate {
  key: string
  name: L
  condition: L
  summary: L
  color: string
  outcomes: L[]
  events: EventTemplate[]
}

export interface OutcomeTemplate {
  title: L
  /** Branch key the outcome belongs to. */
  branchKey: string
  path: L[]
  keyConditions: L[]
  mainImpacts: L[]
  uncertainty: Uncertainty
  uncertaintyReason: L
  differsFrom: L[]
}

export interface MetricTemplate {
  name: L
  domain: DomainId
  direction: Direction
  note: L
  confidence: Confidence
}

export interface BaselineTemplate {
  dy: number
  title: L
  desc: L
  category: DomainId
  sourceName: L
  sourceUrl: string
}

export interface Archetype {
  id: string
  /** Lowercase tokens; a hypothesis containing any token selects this archetype. */
  keywords: string[]
  /** Canonical divergence year used when the hypothesis itself carries no year. */
  canonicalYear: number
  title: L
  assumptions: L[]
  divergence: L
  uncertainties: L[]
  keyDifferences: L[]
  changedAreas: L[]
  baseline: BaselineTemplate[]
  main: EventTemplate[]
  branches: BranchTemplate[]
  outcomes: OutcomeTemplate[]
  metrics: MetricTemplate[]
  /** Extra nodes appended only in the "deep" depth. */
  extra?: EventTemplate[]
  /** Extra branch events appended only in the "deep" depth. */
  extraBranch?: Record<string, EventTemplate[]>
}
