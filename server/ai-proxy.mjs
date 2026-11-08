/**
 * Optional server-side proxy for AI mode (Node 18+ / any serverless runtime).
 *
 * Why: when the browser talks to an OpenAI-compatible endpoint directly, the API
 * key must live in the browser. This proxy keeps the key on the server instead.
 *
 * Run locally:
 *   AI_API_KEY=sk-... AI_BASE_URL=https://api.openai.com/v1 AI_MODEL=gpt-4o-mini \
 *   node server/ai-proxy.mjs
 * Then set “Server proxy URL” in the app to http://localhost:8787/api/simulate
 *
 * This file is intentionally dependency-free. It never logs request bodies or keys.
 */
import { createServer } from 'node:http'

const PORT = Number(process.env.PORT ?? 8787)
const AI_BASE_URL = (process.env.AI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '')
const AI_API_KEY = process.env.AI_API_KEY ?? ''
const AI_MODEL = process.env.AI_MODEL ?? 'gpt-4o-mini'
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? '*'
const MAX_BODY_BYTES = 512 * 1024
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 30

/** Naive in-memory rate limiting: enough for a single-instance free deployment. */
const hits = new Map()

function rateLimited(key) {
  const now = Date.now()
  const entry = hits.get(key)
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    hits.set(key, { start: now, count: 1 })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT_MAX
}

function send(res, status, payload) {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  })
  res.end(body)
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new Error('Body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

/** Only the model, messages and temperature are forwarded — never arbitrary fields. */
function sanitize(payload) {
  const messages = Array.isArray(payload?.messages)
    ? payload.messages
        .filter((message) => message && typeof message.content === 'string')
        .slice(0, 8)
        .map((message) => ({
          role: message.role === 'system' ? 'system' : 'user',
          content: String(message.content).slice(0, 40_000),
        }))
    : []
  return {
    model: typeof payload?.model === 'string' && payload.model ? payload.model.slice(0, 80) : AI_MODEL,
    messages,
    temperature: typeof payload?.temperature === 'number' ? Math.min(1.5, Math.max(0, payload.temperature)) : 0.6,
  }
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    send(res, 204, {})
    return
  }
  if (req.method !== 'POST' || !req.url?.startsWith('/api/simulate')) {
    send(res, 404, { error: 'not_found' })
    return
  }
  if (!AI_API_KEY) {
    send(res, 503, { error: 'server_missing_api_key' })
    return
  }

  const clientKey = req.socket.remoteAddress ?? 'unknown'
  if (rateLimited(clientKey)) {
    send(res, 429, { error: 'rate_limited' })
    return
  }

  let payload
  try {
    payload = JSON.parse(await readBody(req))
  } catch {
    send(res, 400, { error: 'invalid_json' })
    return
  }

  try {
    const upstream = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        ...sanitize(payload),
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(90_000),
    })
    const text = await upstream.text()
    res.writeHead(upstream.status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    })
    res.end(text)
  } catch (error) {
    // Log the failure class only — never the prompt or the key.
    console.error('[ai-proxy] upstream failure:', error?.name ?? 'unknown')
    send(res, 502, { error: 'upstream_failed' })
  }
})

server.listen(PORT, () => {
  console.log(`[ai-proxy] listening on http://localhost:${PORT}/api/simulate`)
  console.log(`[ai-proxy] upstream ${AI_BASE_URL}, model ${AI_MODEL}`)
})
