import { z } from 'zod'
import type { Simulation } from '../types/simulation'
import {
  branchSchema,
  confidenceSchema,
  domainIdSchema,
  baselineFactSchema,
  natureSchema,
  outcomeSchema,
  uncertaintySchema,
  worldStateMetricSchema,
  timelineEventSchema,
  directionSchema,
} from '../types/simulation'
import { newId, parseJsonUnknown } from '../utils/id'

export type AiStage = 'outline' | 'timeline' | 'branches' | 'outcomes' | 'state' | 'done'

export interface AiProgress {
  stage: AiStage
  /** 0..1 within the whole generation. */
  ratio: number
  detail?: string
}

export type AiErrorCode =
  | 'network'
  | 'timeout'
  | 'auth'
  | 'rate'
  | 'schema'
  | 'cancelled'
  | 'empty'
  | 'noConfig'
  | 'unknown'

export class AiGenerationError extends Error {
  code: AiErrorCode
  constructor(code: AiErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'AiGenerationError'
  }
}

export interface AiEndpointConfig {
  mode: 'direct' | 'proxy'
  baseUrl: string
  apiKey: string
  model: string
  proxyUrl: string
}

export interface AiRequestContext {
  hypothesis: string
  year: number
  depth: Simulation['depth']
  style: Simulation['style']
  scopes: Simulation['scopes']
  region?: string
  language: 'zh' | 'en'
}

/* ------------------------------------------------------------------ */
/* Phase schemas: each phase is validated independently.               */
/* ------------------------------------------------------------------ */

const outlineSchema = z.object({
  title: z.string().min(1),
  assumptions: z.array(z.string().min(1)).min(1),
  divergencePoint: z.string().min(1),
  baselineFacts: z.array(baselineFactSchema).default([]),
  uncertainties: z.array(z.string()).default([]),
})

const timelineSchema = z.object({
  events: z
    .array(
      timelineEventSchema.omit({ branchId: true, id: true, relatedEventIds: true }).extend({
        ref: z.string().min(1),
        parentRef: z.string().min(1).optional(),
      }),
    )
    .min(1),
})

const branchesSchema = z.object({
  branches: z
    .array(
      branchSchema.omit({ id: true }).extend({
        ref: z.string().min(1),
        originEventRef: z.string().min(1).optional(),
      }),
    )
    .min(1),
})

const outcomesSchema = z.object({
  outcomes: z
    .array(outcomeSchema.omit({ id: true, branchId: true }).extend({ branchRef: z.string().min(1) }))
    .min(1),
})

const stateSchema = z.object({
  worldState: z.array(worldStateMetricSchema.omit({ id: true })).default([]),
  keyDifferences: z.array(z.string()).default([]),
  changedAreas: z.array(z.string()).default([]),
  uncertainties: z.array(z.string()).default([]),
})

/** Tolerant extraction: models often wrap JSON in prose or fences. */
export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const direct = parseJsonUnknown(trimmed)
  if (direct !== undefined) return direct

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    const parsed = parseJsonUnknown(fenced[1].trim())
    if (parsed !== undefined) return parsed
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const parsed = parseJsonUnknown(trimmed.slice(firstBrace, lastBrace + 1))
    if (parsed !== undefined) return parsed
  }
  return undefined
}

function stagePrompts(ctx: AiRequestContext, prior: Record<string, unknown>) {
  const langLine =
    ctx.language === 'en'
      ? 'Write every human-readable string in English.'
      : '所有人类可读文本必须使用简体中文。'

  const rules = [
    'You are the simulation engine of "What If Lab", a counterfactual history lab.',
    'Return ONLY a JSON object. No prose, no markdown fences, no comments.',
    'Never present inferences or fiction as verified history. Every timeline event needs nature: "FACT" | "INFERENCE" | "FICTION".',
    'FACT is reserved for verifiable real-world events; baselineFacts may only contain verifiable facts.',
    'Do not output probabilities or precise numeric forecasts. Use qualitative direction: "up" | "down" | "stable" | "unknown".',
    langLine,
    'Keep the output compact enough to parse: at most 12 items per array unless stated otherwise.',
  ].join('\n')

  const contextBlock = JSON.stringify(
    {
      hypothesis: ctx.hypothesis,
      startYear: ctx.year,
      depth: ctx.depth,
      style: ctx.style,
      scopes: ctx.scopes,
      region: ctx.region ?? null,
      prior,
    },
    null,
    0,
  )

  return { rules, contextBlock }
}

function buildMessages(system: string, user: string) {
  return [
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ]
}

const PHASE_INSTRUCTIONS: Record<Exclude<AiStage, 'done'>, string> = {
  outline: `Produce the framing of the simulation as JSON:
{"title":string,"assumptions":[string],"divergencePoint":string,"baselineFacts":[{"id":string,"year":number,"title":string,"description":string,"category":"technology|economy|politics|society|culture|environment|science","sourceName":string,"sourceUrl":string,"status":"verified"}],"uncertainties":[string]}
baselineFacts must be real, verifiable events (3-6 items) with a real URL. If you cannot verify one, omit it.`,
  timeline: `Produce the timeline as JSON:
{"events":[{"ref":string,"year":number,"title":string,"description":string,"category":string,"cause":string,"immediateEffects":[string],"longTermEffects":[string],"affected":[string],"confidence":"high|medium|low","nature":"FACT|INFERENCE|FICTION","parentRef":string|null}]}
8-14 events ordered by year. parentRef points to an earlier event ref to express causality.`,
  branches: `Produce 3 diverging branches as JSON:
{"branches":[{"ref":string,"name":string,"originYear":number,"originEventRef":string|null,"condition":string,"summary":string,"color":"#38bdf8","isMain":boolean}]}
The first branch must be the main timeline (isMain true).`,
  outcomes: `Produce outcomes as JSON:
{"outcomes":[{"title":string,"branchRef":string,"path":[string],"keyConditions":[string],"mainImpacts":[string],"uncertainty":"low|medium|high","uncertaintyReason":string,"differsFrom":[string]}]}
3-4 outcomes, one per branch where possible. Never output numeric probabilities.`,
  state: `Produce the world-state panel and reality comparison as JSON:
{"worldState":[{"name":string,"domain":string,"direction":"up|down|stable|unknown","note":string,"confidence":"high|medium|low"}],"keyDifferences":[string],"changedAreas":[string],"uncertainties":[string]}
4-8 qualitative indicators. No fabricated numeric values.`,
}

async function callModel(
  config: AiEndpointConfig,
  messages: { role: 'system' | 'user'; content: string }[],
  signal: AbortSignal,
  timeoutMs: number,
): Promise<string> {
  const url = config.mode === 'proxy' ? config.proxyUrl : `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.mode === 'direct' && config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`
  }

  const body =
    config.mode === 'proxy'
      ? { model: config.model, messages, temperature: 0.6 }
      : { model: config.model, messages, temperature: 0.6, response_format: { type: 'json_object' } }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs)
  const onAbort = () => controller.abort('cancelled')
  signal.addEventListener('abort', onAbort)

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    })
  } catch (error) {
    const reason = controller.signal.reason
    if (reason === 'timeout') throw new AiGenerationError('timeout', 'Request timed out')
    if (reason === 'cancelled' || signal.aborted) throw new AiGenerationError('cancelled', 'Cancelled')
    throw new AiGenerationError('network', error instanceof Error ? error.message : 'Network error')
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', onAbort)
  }

  if (response.status === 401 || response.status === 403) {
    throw new AiGenerationError('auth', `HTTP ${response.status}`)
  }
  if (response.status === 429) {
    throw new AiGenerationError('rate', 'HTTP 429')
  }
  if (!response.ok) {
    throw new AiGenerationError('network', `HTTP ${response.status}`)
  }

  const payload: unknown = await response.json().catch(() => undefined)
  const content = readChoiceContent(payload)
  if (!content) throw new AiGenerationError('empty', 'Empty completion')
  return content
}

function readChoiceContent(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null) return ''
  const choices = (payload as { choices?: unknown }).choices
  if (!Array.isArray(choices) || choices.length === 0) return ''
  const first = choices[0] as {
    message?: { content?: unknown }
    delta?: { content?: unknown }
    text?: unknown
  }
  const fromMessage = first.message?.content
  if (typeof fromMessage === 'string') return fromMessage
  const fromDelta = first.delta?.content
  if (typeof fromDelta === 'string') return fromDelta
  if (typeof first.text === 'string') return first.text
  return ''
}

/** One phase with one structured-repair retry. */
async function runPhase<T>(
  schema: z.ZodType<T>,
  stage: Exclude<AiStage, 'done'>,
  config: AiEndpointConfig,
  ctx: AiRequestContext,
  prior: Record<string, unknown>,
  signal: AbortSignal,
  timeoutMs: number,
  onProgress: (progress: AiProgress) => void,
): Promise<T> {
  const { rules, contextBlock } = stagePrompts(ctx, prior)
  const system = `${rules}\n\n${PHASE_INSTRUCTIONS[stage]}`
  const messages = buildMessages(system, contextBlock)

  const attempt = async (extra?: string): Promise<T> => {
    const finalMessages = extra
      ? [...messages, { role: 'user' as const, content: extra }]
      : messages
    const raw = await callModel(config, finalMessages, signal, timeoutMs)
    const json = extractJson(raw)
    if (json === undefined) {
      throw new AiGenerationError('schema', 'Response was not JSON')
    }
    const parsed = schema.safeParse(json)
    if (!parsed.success) {
      const issues = parsed.error.issues
        .slice(0, 6)
        .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
        .join('; ')
      throw new AiGenerationError('schema', issues)
    }
    return parsed.data
  }

  try {
    return await attempt()
  } catch (error) {
    if (error instanceof AiGenerationError && error.code === 'schema') {
      onProgress({ stage, ratio: 0, detail: 'repair' })
      return attempt(
        `The previous reply violated the schema: ${error.message}. Reply again with ONLY valid JSON matching the schema.`,
      )
    }
    throw error
  }
}

export interface RunAiOptions {
  config: AiEndpointConfig
  ctx: AiRequestContext
  onProgress?: (progress: AiProgress) => void
  signal: AbortSignal
  timeoutMs?: number
  idPrefix?: string
  createdAt?: string
}

/**
 * Phased AI generation: 5 small requests instead of one huge one, so a long
 * output can never lock up the page and progress is visible.
 */
export async function generateAiSimulation(options: RunAiOptions): Promise<Simulation> {
  const { config, ctx, signal } = options
  const timeoutMs = options.timeoutMs ?? 90_000
  const onProgress = options.onProgress ?? (() => undefined)
  const id = options.idPrefix ?? newId('sim')
  const now = options.createdAt ?? new Date().toISOString()

  if (config.mode === 'direct' && !config.apiKey.trim()) {
    throw new AiGenerationError('noConfig', 'Missing API key')
  }
  if (config.mode === 'proxy' && !config.proxyUrl.trim()) {
    throw new AiGenerationError('noConfig', 'Missing proxy URL')
  }

  const prior: Record<string, unknown> = {}

  onProgress({ stage: 'outline', ratio: 0.05 })
  const outline = await runPhase(outlineSchema, 'outline', config, ctx, prior, signal, timeoutMs, onProgress)
  prior.outline = outline

  onProgress({ stage: 'timeline', ratio: 0.3 })
  const timeline = await runPhase(timelineSchema, 'timeline', config, ctx, prior, signal, timeoutMs, onProgress)
  prior.timeline = timeline.events.map((event) => ({ ref: event.ref, year: event.year, title: event.title }))

  onProgress({ stage: 'branches', ratio: 0.55 })
  const branches = await runPhase(branchesSchema, 'branches', config, ctx, prior, signal, timeoutMs, onProgress)

  onProgress({ stage: 'outcomes', ratio: 0.72 })
  const outcomes = await runPhase(outcomesSchema, 'outcomes', config, ctx, prior, signal, timeoutMs, onProgress)

  onProgress({ stage: 'state', ratio: 0.88 })
  const state = await runPhase(stateSchema, 'state', config, ctx, prior, signal, timeoutMs, onProgress)

  // ---- assemble ----
  const mainRef = branches.branches.find((branch) => branch.isMain)?.ref ?? branches.branches[0].ref
  const branchIdByRef = new Map<string, string>()
  branches.branches.forEach((branch, index) => {
    branchIdByRef.set(branch.ref, `${id}_b${index}`)
  })

  const eventIdByRef = new Map<string, string>()
  timeline.events.forEach((event, index) => {
    eventIdByRef.set(event.ref, `${id}_e${index}`)
  })

  const mainBranchId = branchIdByRef.get(mainRef) ?? `${id}_b0`

  const events = timeline.events.map((event, index) => ({
    id: `${id}_e${index}`,
    // Events without a branch assignment belong to the main timeline.
    branchId: mainBranchId,
    year: event.year,
    title: event.title,
    description: event.description,
    category: event.category,
    cause: event.cause,
    immediateEffects: event.immediateEffects,
    longTermEffects: event.longTermEffects,
    affected: event.affected,
    confidence: event.confidence,
    nature: event.nature,
    parentEventId: event.parentRef ? eventIdByRef.get(event.parentRef) : undefined,
    relatedEventIds: [] as string[],
  }))

  const assembledBranches = branches.branches.map((branch, index) => ({
    id: branchIdByRef.get(branch.ref) ?? `${id}_b${index}`,
    name: branch.name,
    originEventId: branch.originEventRef ? eventIdByRef.get(branch.originEventRef) : undefined,
    originYear: branch.originYear,
    condition: branch.condition,
    summary: branch.summary,
    color: branch.color,
    isMain: branch.isMain,
  }))

  const assembledOutcomes = outcomes.outcomes.map((outcome, index) => ({
    id: `${id}_o${index}`,
    title: outcome.title,
    branchId: branchIdByRef.get(outcome.branchRef) ?? mainBranchId,
    path: outcome.path,
    keyConditions: outcome.keyConditions,
    mainImpacts: outcome.mainImpacts,
    uncertainty: outcome.uncertainty,
    uncertaintyReason: outcome.uncertaintyReason,
    differsFrom: outcome.differsFrom,
  }))

  const worldState = state.worldState.map((metric, index) => ({
    id: `${id}_m${index}`,
    name: metric.name,
    domain: metric.domain,
    direction: metric.direction,
    note: metric.note,
    confidence: metric.confidence,
  }))

  const baselineFacts = outline.baselineFacts.map((fact, index) => ({
    ...fact,
    id: fact.id || `${id}_f${index}`,
  }))

  onProgress({ stage: 'done', ratio: 1 })

  return {
    id,
    title: outline.title,
    hypothesis: ctx.hypothesis,
    startingYear: ctx.year,
    era: 'custom',
    scopes: ctx.scopes,
    region: ctx.region,
    style: ctx.style,
    depth: ctx.depth,
    language: ctx.language,
    engine: 'ai',
    createdAt: now,
    updatedAt: now,
    isExample: false,
    assumptions: outline.assumptions,
    baselineFacts,
    divergencePoint: outline.divergencePoint,
    branches: assembledBranches,
    events,
    outcomes: assembledOutcomes,
    worldState,
    uncertainties: [...outline.uncertainties, ...state.uncertainties],
    realityComparison: {
      realEvents: baselineFacts,
      simulatedEventIds: events.slice(0, 6).map((event) => event.id),
      keyDifferences: state.keyDifferences,
      changedAreas: state.changedAreas,
    },
    engineNote:
      ctx.language === 'en'
        ? 'Generated by the configured AI service, validated against the simulation schema phase by phase.'
        : '由所配置的 AI 服务分阶段生成，并逐阶段通过模拟数据结构校验。',
  }
}

/** Exported for unit tests: verifies a raw model reply against a phase schema. */
export const aiPhaseSchemas = {
  outlineSchema,
  timelineSchema,
  branchesSchema,
  outcomesSchema,
  stateSchema,
  domainIdSchema,
  natureSchema,
  confidenceSchema,
  directionSchema,
  uncertaintySchema,
}
