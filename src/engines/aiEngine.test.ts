import { describe, expect, it } from 'vitest'
import { aiPhaseSchemas, extractJson } from './aiEngine'

describe('AI output parsing', () => {
  it('parses a bare JSON object', () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
  })

  it('parses JSON inside a markdown fence', () => {
    const text = 'Here you go:\n```json\n{"title":"x"}\n```\nDone.'
    expect(extractJson(text)).toEqual({ title: 'x' })
  })

  it('parses JSON surrounded by prose', () => {
    const text = 'Sure! {"title":"y"} that is all.'
    expect(extractJson(text)).toEqual({ title: 'y' })
  })

  it('returns undefined for non-JSON output', () => {
    expect(extractJson('I cannot answer that.')).toBeUndefined()
  })

  it('rejects an outline missing required fields', () => {
    const result = aiPhaseSchemas.outlineSchema.safeParse({ title: 'x' })
    expect(result.success).toBe(false)
  })

  it('accepts a valid outline with baseline facts', () => {
    const result = aiPhaseSchemas.outlineSchema.safeParse({
      title: 'If Bitcoin never existed',
      assumptions: ['no genesis block'],
      divergencePoint: 'no public ledger',
      baselineFacts: [
        {
          id: 'f1',
          year: 2008,
          title: 'Whitepaper',
          description: 'Published 31 Oct 2008',
          category: 'technology',
          sourceName: 'bitcoin.org',
          sourceUrl: 'https://bitcoin.org/bitcoin.pdf',
          status: 'verified',
        },
      ],
      uncertainties: ['unknown adoption curve'],
    })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown content nature on a timeline event', () => {
    const result = aiPhaseSchemas.timelineSchema.safeParse({
      events: [
        {
          ref: 'e1',
          year: 2010,
          title: 'x',
          description: 'y',
          category: 'technology',
          cause: 'z',
          immediateEffects: [],
          longTermEffects: [],
          affected: [],
          confidence: 'high',
          nature: 'GUESS',
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})
