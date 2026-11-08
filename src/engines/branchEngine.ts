import type { Simulation, TimelineEvent } from '../types/simulation'
import { newId } from '../utils/id'

const branchPalette = ['#38bdf8', '#a78bfa', '#f59e0b', '#34d399', '#f472b6', '#facc15', '#22d3ee']

/**
 * Adds a new branch to a copy of the simulation. The main timeline, its events
 * and every existing branch stay byte-identical, so branching never overwrites
 * the original reasoning path.
 */
export function createBranchFromEvent(
  simulation: Simulation,
  seed: { originEventId: string; condition: string; name: string },
  lang: 'zh' | 'en',
): Simulation {
  const origin = simulation.events.find((event) => event.id === seed.originEventId)
  if (!origin) {
    throw new Error('Origin event not found')
  }

  const branchId = newId('br')
  const color = branchPalette[simulation.branches.length % branchPalette.length]
  const now = new Date().toISOString()

  const branch = {
    id: branchId,
    name: seed.name,
    originEventId: origin.id,
    originYear: origin.year,
    condition: seed.condition,
    summary:
      lang === 'en'
        ? `Forked from “${origin.title}”. The changed condition is applied from ${origin.year} onward.`
        : `从「${origin.title}」分叉，新的变化条件从 ${origin.year} 年起生效。`,
    color,
    isMain: false,
  }

  const makeEvent = (
    offset: number,
    title: string,
    description: string,
    category: TimelineEvent['category'],
    cause: string,
    nature: TimelineEvent['nature'],
    confidence: TimelineEvent['confidence'],
    parentEventId: string,
  ): TimelineEvent => ({
    id: newId('ev'),
    branchId,
    year: origin.year + offset,
    title,
    description,
    category,
    cause,
    immediateEffects:
      lang === 'en'
        ? ['The affected group adjusts its behaviour first.', 'Institutions face immediate adaptation pressure.']
        : ['受影响最直接的群体首先调整行为。', '相关制度立刻面临适应压力。'],
    longTermEffects:
      lang === 'en'
        ? ['The resulting structure diverges from the main timeline.', 'New path dependence forms around the changed condition.']
        : ['结果结构与主时间线出现差异。', '围绕新的变化条件形成新的路径依赖。'],
    affected: lang === 'en' ? ['Affected groups', 'Institutions'] : ['受影响群体', '制度'],
    confidence,
    nature,
    parentEventId,
    relatedEventIds: [],
  })

  const first = makeEvent(
    1,
    lang === 'en' ? 'The changed condition takes effect' : '变化条件生效',
    seed.condition,
    origin.category,
    lang === 'en' ? `Applied on top of “${origin.title}”.` : `叠加在「${origin.title}」之上。`,
    'INFERENCE',
    'medium',
    origin.id,
  )

  const second = makeEvent(
    3,
    lang === 'en' ? 'Immediate adjustment' : '初步调整',
    lang === 'en'
      ? 'Actors react to the changed condition and the first substitution effects appear.'
      : '行为主体对变化条件做出反应，第一批替代效应出现。',
    origin.category,
    lang === 'en' ? 'The changed condition invalidates the previous default.' : '变化条件使原有默认路径失效。',
    'INFERENCE',
    'medium',
    first.id,
  )

  const third = makeEvent(
    6,
    lang === 'en' ? 'A distinct outcome path' : '形成独立的结果路径',
    lang === 'en'
      ? 'The branch stabilises into a structure that differs from the main timeline.'
      : '该分支稳定为一个与主时间线不同的结构。',
    'society',
    lang === 'en' ? 'Accumulated adaptation inside this branch.' : '本分支内部累积的适应行为。',
    'INFERENCE',
    'low',
    second.id,
  )

  return {
    ...simulation,
    updatedAt: now,
    branches: [...simulation.branches, branch],
    events: [...simulation.events, first, second, third],
    engineNote: [simulation.engineNote, lang === 'en' ? 'A branch was added; the main timeline is unchanged.' : '已新增分支，主时间线保持不变。']
      .filter(Boolean)
      .join(' '),
  }
}

/** Creates a new simulation version through "What If Again" without touching the parent. */
export function createVersionNote(parent: Simulation, condition: string, lang: 'zh' | 'en'): string {
  return lang === 'en'
    ? `Derived from “${parent.title}”. Added condition: ${condition}`
    : `由「${parent.title}」派生。新增条件：${condition}`
}

/** Guards branch integrity when importing or editing: no cycles, no dangling parents. */
export function validateBranchIntegrity(simulation: Simulation): string[] {
  const issues: string[] = []
  const branchIds = new Set(simulation.branches.map((branch) => branch.id))
  const eventIds = new Set(simulation.events.map((event) => event.id))

  for (const event of simulation.events) {
    if (!branchIds.has(event.branchId)) {
      issues.push(`Event ${event.id} references unknown branch ${event.branchId}`)
    }
    if (event.parentEventId && !eventIds.has(event.parentEventId)) {
      issues.push(`Event ${event.id} references unknown parent ${event.parentEventId}`)
    }
    if (event.parentEventId === event.id) {
      issues.push(`Event ${event.id} is its own parent`)
    }
  }

  for (const branch of simulation.branches) {
    if (branch.originEventId && !eventIds.has(branch.originEventId)) {
      issues.push(`Branch ${branch.id} references unknown origin ${branch.originEventId}`)
    }
  }

  // Cycle detection over parentEventId links.
  const parentOf = new Map(simulation.events.map((event) => [event.id, event.parentEventId]))
  for (const event of simulation.events) {
    const seen = new Set<string>()
    let cursor: string | undefined = event.id
    while (cursor) {
      if (seen.has(cursor)) {
        issues.push(`Cycle detected through event ${event.id}`)
        break
      }
      seen.add(cursor)
      cursor = parentOf.get(cursor)
    }
  }

  return issues
}

export function sortEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.year - b.year || a.title.localeCompare(b.title))
}
