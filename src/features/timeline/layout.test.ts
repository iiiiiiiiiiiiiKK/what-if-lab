import { describe, expect, it } from 'vitest'
import { layoutTimeline, formatYear, NODE_WIDTH } from './layout'
import type { TimelineEvent } from '../../types/simulation'

function event(id: string, branchId: string, year: number): TimelineEvent {
  return {
    id,
    branchId,
    year,
    title: id,
    description: '',
    category: 'technology',
    cause: '',
    immediateEffects: [],
    longTermEffects: [],
    affected: [],
    confidence: 'high',
    nature: 'INFERENCE',
    relatedEventIds: [],
  }
}

describe('timeline layout', () => {
  it('separates overlapping nodes in the same lane', () => {
    const events = [event('a', 'b1', 2000), event('b', 'b1', 2000)]
    const layout = layoutTimeline({ events, branchOrder: ['b1'] }, (year) => (year - 2000) * 10)
    const a = layout.nodes.get('a')!
    const b = layout.nodes.get('b')!
    expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(NODE_WIDTH)
  })

  it('places different branches on different lanes', () => {
    const events = [event('a', 'b1', 2000), event('b', 'b2', 2000)]
    const layout = layoutTimeline({ events, branchOrder: ['b1', 'b2'] }, () => 100)
    expect(layout.nodes.get('a')!.y).not.toBe(layout.nodes.get('b')!.y)
  })

  it('reports the year range', () => {
    const events = [event('a', 'b1', 1900), event('b', 'b1', 2020)]
    const layout = layoutTimeline({ events, branchOrder: ['b1'] }, (year) => year)
    expect(layout.minYear).toBe(1900)
    expect(layout.maxYear).toBe(2020)
  })

  it('formats years for both languages', () => {
    expect(formatYear(1969, 'en')).toBe('1969')
    expect(formatYear(1969, 'zh')).toContain('1969')
    expect(formatYear(-44, 'en')).toBe('44 BCE')
    expect(formatYear(-44, 'zh')).toContain('公元前')
    expect(formatYear(-66000000, 'en')).toContain('million years ago')
  })
})
