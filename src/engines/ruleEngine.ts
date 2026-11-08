import type { Simulation } from '../types/simulation'
import { newId } from '../utils/id'
import { hashString } from '../utils/random'
import { loc } from '../data/archetypes/archetypeTypes'
import { createGenericArchetype } from './generic'
import { archetypes } from '../data/archetypes'

export interface GenerateOptions {
  /** Prefix for all generated ids, so forks never collide. */
  idPrefix?: string
  createdAt?: string
}

const branchColors = ['#38bdf8', '#a78bfa', '#f59e0b', '#34d399', '#f472b6', '#facc15']

export function matchArchetype(hypothesis: string) {
  const text = hypothesis.toLowerCase()
  let best: { archetype: (typeof archetypes)[number]; score: number } | null = null
  for (const archetype of archetypes) {
    let score = 0
    for (const keyword of archetype.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score += keyword.length
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { archetype, score }
    }
  }
  return best?.archetype ?? null
}

const styleLens = {
  realist: {
    zh: '严谨现实派：只保留可解释的因果链，避免戏剧化假设。',
    en: 'Strict realist: only explainable causal chains are kept; dramatic premises are avoided.',
  },
  scifi: {
    zh: '科幻想象派：在不违反内部一致性的前提下延伸技术可能性。',
    en: 'Sci-fi imagination: technical possibilities are extended while keeping internal consistency.',
  },
  dark: {
    zh: '黑暗未来派：侧重风险、冲突与制度失败路径。',
    en: 'Dark future: emphasises risk, conflict and institutional failure paths.',
  },
  optimistic: {
    zh: '乐观未来派：侧重适应能力、合作与技术溢出。',
    en: 'Optimistic future: emphasises adaptation, cooperation and spillovers.',
  },
  economic: {
    zh: '经济分析派：以成本、激励与要素配置为主要解释变量。',
    en: 'Economic analysis: cost, incentives and factor allocation are the main explanatory variables.',
  },
  historical: {
    zh: '历史研究派：强调制度路径依赖与史料边界。',
    en: 'Historical research: emphasises institutional path dependence and the limits of sources.',
  },
} as const

export function generateRuleSimulation(
  hypothesis: string,
  options: {
    language: 'zh' | 'en'
    year: number
    depth: 'quick' | 'standard' | 'deep'
    style: keyof typeof styleLens
    era: Simulation['era']
    scopes: Simulation['scopes']
    customScope?: string
    region?: string
  },
  generateOptions: GenerateOptions = {},
): Simulation {
  const lang = options.language
  const matched = matchArchetype(hypothesis)
  const archetype = matched ?? createGenericArchetype(hypothesis, options.year)
  const baseYear = matched ? archetype.canonicalYear : options.year
  const id = generateOptions.idPrefix ?? newId('sim')
  const now = generateOptions.createdAt ?? new Date().toISOString()

  const depth = options.depth
  const mainTemplates =
    depth === 'deep' && archetype.extra ? [...archetype.main, ...archetype.extra] : archetype.main
  const usedMain = depth === 'quick' ? mainTemplates.slice(0, 3) : mainTemplates

  // ---- ids ----
  const mainBranchId = `${id}_b0`
  const eventId = (branchIndex: number, eventIndex: number) => `${id}_b${branchIndex}e${eventIndex}`

  const events: Simulation['events'] = []

  usedMain.forEach((template, index) => {
    events.push({
      id: eventId(0, index),
      branchId: mainBranchId,
      year: baseYear + template.dy,
      title: loc(template.title, lang),
      description: loc(template.desc, lang),
      category: template.category,
      cause: loc(template.cause, lang),
      immediateEffects: template.immediate.map((item) => loc(item, lang)),
      longTermEffects: template.longTerm.map((item) => loc(item, lang)),
      affected: template.affected.map((item) => loc(item, lang)),
      confidence: template.confidence,
      nature: template.nature,
      parentEventId:
        template.parentIndex === undefined ? undefined : eventId(0, template.parentIndex),
      relatedEventIds: [],
    })
  })

  const branchTemplates =
    depth === 'quick' ? archetype.branches.slice(0, 1) : archetype.branches

  const branches: Simulation['branches'] = [
    {
      id: mainBranchId,
      name: lang === 'en' ? 'Main timeline' : '主时间线',
      originYear: baseYear,
      condition: loc(archetype.divergence, lang),
      summary:
        lang === 'en'
          ? 'The primary reasoning path derived from the changed condition.'
          : '由分歧条件直接推出的主要推演路径。',
      color: branchColors[0],
      isMain: true,
    },
  ]

  branchTemplates.forEach((template, branchIndex) => {
    const branchId = `${id}_b${branchIndex + 1}`
    const origin = events[Math.min(1, Math.max(0, events.length - 1))]
    branches.push({
      id: branchId,
      name: loc(template.name, lang),
      originEventId: origin?.id,
      originYear: origin?.year ?? baseYear,
      condition: loc(template.condition, lang),
      summary: loc(template.summary, lang),
      color: template.color || branchColors[(branchIndex + 1) % branchColors.length],
      isMain: false,
    })

    const extraForBranch =
      depth === 'deep' && archetype.extraBranch?.[template.key]
        ? [...template.events, ...archetype.extraBranch[template.key]]
        : template.events
    const branchEvents = depth === 'quick' ? extraForBranch.slice(0, 1) : extraForBranch

    branchEvents.forEach((eventTemplate, eventIndex) => {
      events.push({
        id: eventId(branchIndex + 1, eventIndex),
        branchId,
        year: (origin?.year ?? baseYear) + eventTemplate.dy,
        title: loc(eventTemplate.title, lang),
        description: loc(eventTemplate.desc, lang),
        category: eventTemplate.category,
        cause: loc(eventTemplate.cause, lang),
        immediateEffects: eventTemplate.immediate.map((item) => loc(item, lang)),
        longTermEffects: eventTemplate.longTerm.map((item) => loc(item, lang)),
        affected: eventTemplate.affected.map((item) => loc(item, lang)),
        confidence: eventTemplate.confidence,
        nature: eventTemplate.nature,
        parentEventId: origin?.id,
        relatedEventIds: [],
      })
    })
  })

  // Cross-branch "related events" for the same domain within a decade.
  for (const event of events) {
    event.relatedEventIds = events
      .filter(
        (other) =>
          other.id !== event.id &&
          other.branchId !== event.branchId &&
          other.category === event.category &&
          Math.abs(other.year - event.year) <= 12,
      )
      .slice(0, 3)
      .map((other) => other.id)
  }

  const outcomeCount = depth === 'quick' ? 2 : depth === 'standard' ? Math.min(3, archetype.outcomes.length) : archetype.outcomes.length

  const outcomes: Simulation['outcomes'] = archetype.outcomes.slice(0, outcomeCount).map((template, index) => {
    const branchKey = template.branchKey
    const templateIndex = archetype.branches.findIndex((item) => item.key === branchKey)
    const branch =
      branchKey === 'main'
        ? branches[0]
        : templateIndex >= 0
          ? branches[templateIndex + 1]
          : branches[Math.min(index + 1, branches.length - 1)]
    return {
      id: `${id}_o${index}`,
      title: loc(template.title, lang),
      branchId: branch?.id,
      path: template.path.map((item) => loc(item, lang)),
      keyConditions: template.keyConditions.map((item) => loc(item, lang)),
      mainImpacts: template.mainImpacts.map((item) => loc(item, lang)),
      uncertainty: template.uncertainty,
      uncertaintyReason: loc(template.uncertaintyReason, lang),
      differsFrom: template.differsFrom.map((item) => loc(item, lang)),
    }
  })

  const metricCount = depth === 'quick' ? 3 : depth === 'standard' ? Math.min(4, archetype.metrics.length) : archetype.metrics.length
  const worldState: Simulation['worldState'] = archetype.metrics.slice(0, metricCount).map((metric, index) => ({
    id: `${id}_m${index}`,
    name: loc(metric.name, lang),
    domain: metric.domain,
    direction: metric.direction,
    note: loc(metric.note, lang),
    confidence: metric.confidence,
  }))

  const baselineFacts = archetype.baseline.map((fact, index) => ({
    id: `${id}_f${index}`,
    year: baseYear + fact.dy,
    title: loc(fact.title, lang),
    description: loc(fact.desc, lang),
    category: fact.category,
    sourceName: loc(fact.sourceName, lang),
    sourceUrl: fact.sourceUrl,
    status: 'verified' as const,
  }))

  const uncertainties = [
    ...archetype.uncertainties.map((item) => loc(item, lang)),
    lang === 'en' ? styleLens[options.style].en : styleLens[options.style].zh,
  ]

  const engineNotes: string[] = []
  if (matched) {
    engineNotes.push(
      lang === 'en'
        ? `Matched curated archetype “${matched.id}”. Its canonical divergence year is ${matched.canonicalYear}.`
        : `匹配到内置推演模板「${matched.id}」，其标准分歧年份为 ${matched.canonicalYear}。`,
    )
    if (options.era === 'custom' && options.year !== matched.canonicalYear) {
      engineNotes.push(
        lang === 'en'
          ? `You asked for a start at ${options.year}; the curated case keeps its canonical year so its historical baseline stays valid. Use “What if again” to shift the premise.`
          : `你选择的起点是 ${options.year}；为保证现实基线与因果链成立，本案例仍按标准年份推演。可用「继续改变历史」调整前提。`,
      )
    }
  } else {
    engineNotes.push(
      lang === 'en'
        ? 'No curated archetype matched. A neutral, rule-driven skeleton was generated — it is structural, not expert analysis.'
        : '未匹配到内置模板，已生成中性的规则驱动骨架——它是结构性推演，不是专家分析。',
    )
  }

  const simulation: Simulation = {
    id,
    title: loc(archetype.title, lang),
    hypothesis,
    startingYear: baseYear,
    era: options.era,
    scopes: options.scopes,
    customScope: options.customScope,
    region: options.region,
    style: options.style,
    depth,
    language: lang,
    engine: 'rule',
    createdAt: now,
    updatedAt: now,
    isExample: false,
    assumptions: archetype.assumptions.map((item) => loc(item, lang)),
    baselineFacts,
    divergencePoint: loc(archetype.divergence, lang),
    branches,
    events,
    outcomes,
    worldState,
    uncertainties,
    realityComparison: {
      realEvents: baselineFacts,
      simulatedEventIds: events.slice(0, 6).map((event) => event.id),
      keyDifferences: archetype.keyDifferences.map((item) => loc(item, lang)),
      changedAreas: archetype.changedAreas.map((item) => loc(item, lang)),
    },
    engineNote: engineNotes.join(' '),
  }

  return simulation
}

/** Deterministic seed helpers exposed for the tests. */
export function archetypeSeed(hypothesis: string): number {
  return hashString(hypothesis.trim().toLowerCase())
}

export const archetypeCount = archetypes.length
