import { describe, expect, it } from 'vitest'
import { generateRuleSimulation, matchArchetype } from './ruleEngine'
import { simulationSchema } from '../types/simulation'
import { validateBranchIntegrity } from './branchEngine'

const baseOptions = {
  language: 'zh' as const,
  year: 2008,
  depth: 'standard' as const,
  style: 'realist' as const,
  era: 'modern' as const,
  scopes: ['global' as const],
}

describe('rule engine', () => {
  it('produces a schema-valid simulation for a curated archetype', () => {
    const simulation = generateRuleSimulation('如果比特币从未诞生？', baseOptions)
    const parsed = simulationSchema.safeParse(simulation)
    expect(parsed.success).toBe(true)
    expect(simulation.events.length).toBeGreaterThan(3)
    expect(simulation.branches.length).toBeGreaterThan(1)
    expect(simulation.outcomes.length).toBeGreaterThan(1)
    expect(simulation.engine).toBe('rule')
  })

  it('never labels baseline facts as inference or fiction', () => {
    const simulation = generateRuleSimulation('如果比特币从未诞生？', baseOptions)
    for (const fact of simulation.baselineFacts) {
      expect(fact.status).toBe('verified')
      expect(fact.sourceUrl).toMatch(/^https?:\/\//)
    }
  })

  it('keeps events inside declared branches and free of cycles', () => {
    const simulation = generateRuleSimulation('如果恐龙没有灭绝？', baseOptions)
    expect(validateBranchIntegrity(simulation)).toEqual([])
  })

  it('grows monotonically with depth', () => {
    const quick = generateRuleSimulation('如果人类从未发现石油？', { ...baseOptions, depth: 'quick' })
    const deep = generateRuleSimulation('如果人类从未发现石油？', { ...baseOptions, depth: 'deep' })
    expect(deep.events.length).toBeGreaterThan(quick.events.length)
    expect(deep.outcomes.length).toBeGreaterThanOrEqual(quick.outcomes.length)
  })

  it('falls back to a neutral skeleton for unknown hypotheses', () => {
    const simulation = generateRuleSimulation('如果所有的猫都会说话？', baseOptions)
    expect(simulationSchema.safeParse(simulation).success).toBe(true)
    expect(simulation.isExample).toBe(false)
    expect(simulation.engineNote).toBeTruthy()
    // The generic skeleton must not invent baseline "facts".
    expect(simulation.baselineFacts.length).toBe(0)
  })

  it('is deterministic for identical input', () => {
    const a = generateRuleSimulation('如果 AI 提前 100 年诞生？', baseOptions, { idPrefix: 'x' })
    const b = generateRuleSimulation('如果 AI 提前 100 年诞生？', baseOptions, { idPrefix: 'x' })
    expect(a.events.map((event) => event.title)).toEqual(b.events.map((event) => event.title))
  })

  it('matches archetypes case-insensitively', () => {
    expect(matchArchetype('WHAT IF BITCOIN NEVER EXISTED')?.id).toBe('bitcoin')
    expect(matchArchetype('如果罗马帝国从未衰落？')?.id).toBe('rome')
    expect(matchArchetype('完全无关的问题')).toBeNull()
  })

  it('supports English output', () => {
    const simulation = generateRuleSimulation('What if the Moon did not exist?', {
      ...baseOptions,
      language: 'en',
    })
    expect(simulation.language).toBe('en')
    expect(simulation.events[0].description).not.toMatch(/[\u4e00-\u9fa5]/)
  })
})
