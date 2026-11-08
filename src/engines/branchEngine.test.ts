import { describe, expect, it } from 'vitest'
import { generateRuleSimulation } from './ruleEngine'
import { createBranchFromEvent, validateBranchIntegrity } from './branchEngine'

function buildSimulation() {
  return generateRuleSimulation(
    '如果比特币从未诞生？',
    {
      language: 'zh',
      year: 2008,
      depth: 'standard',
      style: 'realist',
      era: 'modern',
      scopes: ['global'],
    },
    { idPrefix: 't' },
  )
}

describe('branch engine', () => {
  it('adds a branch without touching the main timeline', () => {
    const original = buildSimulation()
    const origin = original.events[1]
    const next = createBranchFromEvent(
      original,
      { originEventId: origin.id, condition: '如果各国在 2012 年联合发行央行数字货币', name: '测试分支' },
      'zh',
    )

    expect(next.branches.length).toBe(original.branches.length + 1)
    // Original data is untouched.
    expect(original.branches.length).toBeLessThan(next.branches.length)
    expect(next.events.slice(0, original.events.length)).toEqual(original.events)
    expect(next.branches[0]).toEqual(original.branches[0])
    // New events belong to the new branch and chain from the origin.
    const newEvents = next.events.slice(original.events.length)
    expect(newEvents.length).toBeGreaterThan(0)
    expect(newEvents[0].branchId).toBe(next.branches[next.branches.length - 1].id)
    expect(newEvents[0].parentEventId).toBe(origin.id)
  })

  it('keeps branch integrity valid after forking', () => {
    const original = buildSimulation()
    const origin = original.events[2]
    const next = createBranchFromEvent(
      original,
      { originEventId: origin.id, condition: '如果联盟链提前十年成熟', name: '另一个分支' },
      'zh',
    )
    expect(validateBranchIntegrity(next)).toEqual([])
  })

  it('rejects an unknown origin event', () => {
    const original = buildSimulation()
    expect(() =>
      createBranchFromEvent(original, { originEventId: 'nope', condition: 'x'.repeat(8), name: 'bad' }, 'zh'),
    ).toThrow()
  })

  it('detects a cyclic parent chain', () => {
    const broken = buildSimulation()
    broken.events[0].parentEventId = broken.events[1].id
    broken.events[1].parentEventId = broken.events[0].id
    const issues = validateBranchIntegrity(broken)
    expect(issues.some((issue) => issue.toLowerCase().includes('cycle'))).toBe(true)
  })
})
