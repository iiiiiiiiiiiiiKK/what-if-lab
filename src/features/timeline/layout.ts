import type { TimelineEvent } from '../../types/simulation'

export interface NodeRect {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export const LANE_HEIGHT = 62
export const NODE_WIDTH = 168
export const NODE_HEIGHT = 40

export interface LayoutInput {
  events: TimelineEvent[]
  branchOrder: string[]
}

export interface LayoutResult {
  nodes: Map<string, NodeRect>
  laneIndexOf: Map<string, number>
  minYear: number
  maxYear: number
  width: number
  height: number
}

/**
 * Deterministic lane layout: events keep their branch lane and are pushed
 * right just enough to avoid overlapping the previous node in the same lane.
 */
export function layoutTimeline(
  input: LayoutInput,
  scale: (year: number) => number,
  padding = 24,
): LayoutResult {
  const nodes = new Map<string, NodeRect>()
  const laneIndexOf = new Map<string, number>()

  input.branchOrder.forEach((branchId, index) => laneIndexOf.set(branchId, index))

  const lastRightByLane = new Map<number, number>()

  const sorted = [...input.events].sort((a, b) => a.year - b.year || a.id.localeCompare(b.id))

  for (const event of sorted) {
    const lane = laneIndexOf.get(event.branchId) ?? 0
    const rawX = scale(event.year)
    const previousRight = lastRightByLane.get(lane) ?? Number.NEGATIVE_INFINITY
    const x = Math.max(rawX, previousRight + 14)
    lastRightByLane.set(lane, x + NODE_WIDTH)
    nodes.set(event.id, {
      id: event.id,
      x,
      y: padding + lane * LANE_HEIGHT,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })
  }

  const years = input.events.map((event) => event.year)
  const minYear = years.length ? Math.min(...years) : 0
  const maxYear = years.length ? Math.max(...years) : 1

  let maxRight = 320
  for (const rect of nodes.values()) {
    maxRight = Math.max(maxRight, rect.x + rect.width)
  }

  return {
    nodes,
    laneIndexOf,
    minYear,
    maxYear,
    width: maxRight + padding,
    height: padding * 2 + Math.max(1, input.branchOrder.length) * LANE_HEIGHT,
  }
}

export function formatYear(year: number, lang: 'zh' | 'en'): string {
  if (year <= -1_000_000) {
    const millions = Math.round(Math.abs(year) / 1_000_000)
    return lang === 'en' ? `${millions} million years ago` : `约 ${millions} 百万年前`
  }
  if (year < 0) {
    const abs = Math.abs(year)
    return lang === 'en' ? `${abs} BCE` : `公元前 ${abs} 年`
  }
  return lang === 'en' ? `${year}` : `${year} 年`
}
