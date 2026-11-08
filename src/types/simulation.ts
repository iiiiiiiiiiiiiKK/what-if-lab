import { z } from 'zod'

/** Domains used for event categories, world-state metrics and filters. */
export const domainIds = [
  'technology',
  'economy',
  'politics',
  'society',
  'culture',
  'environment',
  'science',
  'finance',
] as const
export const domainIdSchema = z.enum(domainIds)
export type DomainId = z.infer<typeof domainIdSchema>

/** Scope of a simulation (what the hypothesis is simulated across). */
export const scopeIds = [
  'global',
  'region',
  'economy',
  'technology',
  'politics',
  'society',
  'finance',
  'environment',
  'civilization',
  'custom',
] as const
export const scopeIdSchema = z.enum(scopeIds)
export type ScopeId = z.infer<typeof scopeIdSchema>

export const depthIds = ['quick', 'standard', 'deep'] as const
export const depthSchema = z.enum(depthIds)
export type Depth = z.infer<typeof depthSchema>

export const styleIds = [
  'realist',
  'scifi',
  'dark',
  'optimistic',
  'economic',
  'historical',
] as const
export const styleSchema = z.enum(styleIds)
export type StyleId = z.infer<typeof styleSchema>

export const eraIds = ['ancient', 'medieval', 'earlymodern', 'modern', 'custom'] as const
export const eraSchema = z.enum(eraIds)
export type EraId = z.infer<typeof eraSchema>

/** FACT = verifiable real history, INFERENCE = reasoned consequence, FICTION = constructed for the thought experiment. */
export const natureIds = ['FACT', 'INFERENCE', 'FICTION'] as const
export const natureSchema = z.enum(natureIds)
export type Nature = z.infer<typeof natureSchema>

export const confidenceIds = ['high', 'medium', 'low'] as const
export const confidenceSchema = z.enum(confidenceIds)
export type Confidence = z.infer<typeof confidenceSchema>

export const directionIds = ['up', 'down', 'stable', 'unknown'] as const
export const directionSchema = z.enum(directionIds)
export type Direction = z.infer<typeof directionSchema>

export const uncertaintyIds = ['low', 'medium', 'high'] as const
export const uncertaintySchema = z.enum(uncertaintyIds)
export type Uncertainty = z.infer<typeof uncertaintySchema>

export const timelineEventSchema = z.object({
  id: z.string().min(1),
  branchId: z.string().min(1),
  /** Year of the event. Negative years mean BCE. */
  year: z.number(),
  dateLabel: z.string().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: domainIdSchema,
  cause: z.string().min(1),
  immediateEffects: z.array(z.string()).default([]),
  longTermEffects: z.array(z.string()).default([]),
  affected: z.array(z.string()).default([]),
  confidence: confidenceSchema,
  nature: natureSchema,
  /** Event that directly caused this one (causality chain inside a branch). */
  parentEventId: z.string().optional(),
  relatedEventIds: z.array(z.string()).default([]),
})
export type TimelineEvent = z.infer<typeof timelineEventSchema>

export const baselineFactSchema = z.object({
  id: z.string().min(1),
  year: z.number(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: domainIdSchema,
  sourceName: z.string().optional(),
  sourceUrl: z.string().url().optional(),
  /** verified = documented real event, background = needs verification. */
  status: z.enum(['verified', 'background']).default('verified'),
})
export type BaselineFact = z.infer<typeof baselineFactSchema>

export const branchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  originEventId: z.string().optional(),
  originYear: z.number(),
  condition: z.string().min(1),
  summary: z.string().min(1),
  color: z.string().min(1),
  isMain: z.boolean().default(false),
})
export type Branch = z.infer<typeof branchSchema>

export const outcomeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  branchId: z.string().optional(),
  path: z.array(z.string()).min(1),
  keyConditions: z.array(z.string()).default([]),
  mainImpacts: z.array(z.string()).default([]),
  uncertainty: uncertaintySchema,
  uncertaintyReason: z.string().min(1),
  differsFrom: z.array(z.string()).default([]),
})
export type Outcome = z.infer<typeof outcomeSchema>

export const worldStateMetricSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  domain: domainIdSchema,
  direction: directionSchema,
  note: z.string().min(1),
  confidence: confidenceSchema,
  /** Optional model output. When present, provenance fields are mandatory in the UI. */
  quantified: z
    .object({
      value: z.string().min(1),
      unit: z.string().min(1),
      source: z.string().min(1),
      method: z.string().min(1),
      assumptions: z.string().min(1),
    })
    .optional(),
})
export type WorldStateMetric = z.infer<typeof worldStateMetricSchema>

export const realityComparisonSchema = z.object({
  realEvents: z.array(baselineFactSchema).default([]),
  simulatedEventIds: z.array(z.string()).default([]),
  keyDifferences: z.array(z.string()).default([]),
  changedAreas: z.array(z.string()).default([]),
})
export type RealityComparison = z.infer<typeof realityComparisonSchema>

export const simulationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  hypothesis: z.string().min(1),
  startingYear: z.number(),
  era: eraSchema.default('modern'),
  scopes: z.array(scopeIdSchema).default(['global']),
  customScope: z.string().optional(),
  region: z.string().optional(),
  style: styleSchema.default('realist'),
  depth: depthSchema.default('standard'),
  language: z.enum(['zh', 'en']).default('zh'),
  engine: z.enum(['rule', 'ai', 'example']).default('rule'),
  createdAt: z.string(),
  updatedAt: z.string(),
  isExample: z.boolean().default(false),
  assumptions: z.array(z.string()).default([]),
  baselineFacts: z.array(baselineFactSchema).default([]),
  divergencePoint: z.string().min(1),
  branches: z.array(branchSchema).min(1),
  events: z.array(timelineEventSchema).default([]),
  outcomes: z.array(outcomeSchema).default([]),
  worldState: z.array(worldStateMetricSchema).default([]),
  uncertainties: z.array(z.string()).default([]),
  realityComparison: realityComparisonSchema.optional(),
  /** Parent simulation when created through "What If Again". */
  parentId: z.string().optional(),
  versionNote: z.string().optional(),
  engineNote: z.string().optional(),
})
export type Simulation = z.infer<typeof simulationSchema>

export const hypothesisInputSchema = z.object({
  hypothesis: z
    .string()
    .trim()
    .min(4, 'Hypothesis is too short')
    .max(600, 'Hypothesis is too long (max 600 characters)'),
  era: eraSchema,
  startingYear: z.number().int().min(-10000).max(3000),
  scopes: z.array(scopeIdSchema).min(1, 'Select at least one scope'),
  customScope: z.string().trim().max(60).optional(),
  region: z.string().trim().max(60).optional(),
  depth: depthSchema,
  style: styleSchema,
  language: z.enum(['zh', 'en']),
})
export type HypothesisInput = z.infer<typeof hypothesisInputSchema>

export const exportBundleSchema = z.object({
  format: z.literal('what-if-lab/export'),
  version: z.literal(1),
  exportedAt: z.string(),
  simulations: z.array(simulationSchema).min(1),
})
export type ExportBundle = z.infer<typeof exportBundleSchema>

export const branchSeedSchema = z.object({
  simulationId: z.string().min(1),
  originEventId: z.string().min(1),
  condition: z.string().trim().min(4).max(400),
  name: z.string().trim().min(2).max(80),
})
export type BranchSeed = z.infer<typeof branchSeedSchema>
