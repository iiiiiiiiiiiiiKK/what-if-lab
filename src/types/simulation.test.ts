import { describe, expect, it } from 'vitest'
import { exportBundleSchema, hypothesisInputSchema, simulationSchema } from '../types/simulation'
import { getExamples } from '../data/examples'

describe('simulation schema', () => {
  it('validates every built-in example', () => {
    for (const example of [...getExamples('zh'), ...getExamples('en')]) {
      const result = simulationSchema.safeParse(example)
      expect(result.success, `example ${example.id} failed`).toBe(true)
    }
  })

  it('rejects a simulation without branches', () => {
    const [example] = getExamples('zh')
    const broken = { ...example, branches: [] }
    expect(simulationSchema.safeParse(broken).success).toBe(false)
  })

  it('rejects an invalid nature value', () => {
    const [example] = getExamples('zh')
    const broken = {
      ...example,
      events: [{ ...example.events[0], nature: 'PROBABLY' }],
    }
    expect(simulationSchema.safeParse(broken).success).toBe(false)
  })

  it('accepts a valid export bundle', () => {
    const bundle = {
      format: 'what-if-lab/export',
      version: 1,
      exportedAt: new Date().toISOString(),
      simulations: getExamples('zh').slice(0, 2),
    }
    expect(exportBundleSchema.safeParse(bundle).success).toBe(true)
  })
})

describe('hypothesis input validation', () => {
  const base = {
    hypothesis: '如果互联网从未诞生？',
    era: 'modern' as const,
    startingYear: 1990,
    scopes: ['global' as const],
    depth: 'standard' as const,
    style: 'realist' as const,
    language: 'zh' as const,
  }

  it('accepts a normal hypothesis', () => {
    expect(hypothesisInputSchema.safeParse(base).success).toBe(true)
  })

  it('rejects an empty hypothesis', () => {
    expect(hypothesisInputSchema.safeParse({ ...base, hypothesis: '' }).success).toBe(false)
  })

  it('rejects an over-long hypothesis', () => {
    expect(hypothesisInputSchema.safeParse({ ...base, hypothesis: 'a'.repeat(601) }).success).toBe(false)
  })

  it('rejects an empty scope list', () => {
    expect(hypothesisInputSchema.safeParse({ ...base, scopes: [] }).success).toBe(false)
  })

  it('rejects an out-of-range year', () => {
    expect(hypothesisInputSchema.safeParse({ ...base, startingYear: 99999 }).success).toBe(false)
  })

  it('accepts non-Latin hypotheses', () => {
    expect(
      hypothesisInputSchema.safeParse({ ...base, hypothesis: 'कोई बिटकॉइन नहीं', language: 'en' }).success,
    ).toBe(true)
  })
})
