/**
 * Verifies AI-mode behaviour against the built app using a local mock endpoint:
 *   - wrong-shaped model output  → typed schema error, nothing saved
 *   - HTTP 500                   → typed network error
 *   - hanging request            → cancel returns to idle, no error dialog
 *   - fully valid 5-phase reply  → a real AI world is created
 *
 * Usage: node scripts/verify-ai-errors.mjs http://localhost:4173
 */
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'

const base = process.argv[2] ?? 'http://localhost:4173'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/**
 * Each phase carries a unique instruction in the SYSTEM message, so detect the
 * phase there (the user message also contains prior context and would match
 * several phases at once).
 */
function happyPhase(rawBody) {
  let system = rawBody
  try {
    const parsed = JSON.parse(rawBody)
    if (Array.isArray(parsed.messages) && typeof parsed.messages[0]?.content === 'string') {
      system = parsed.messages[0].content
    }
  } catch {
    // fall back to matching the raw body
  }

  const has = (marker) => system.includes(marker)

  if (has('"baselineFacts":[{"id"')) {
    return {
      title: 'Mock AI World',
      assumptions: ['Assumption one', 'Assumption two'],
      divergencePoint: 'A mock divergence point for the verification harness.',
      baselineFacts: [],
      uncertainties: ['Mock uncertainty'],
    }
  }
  if (has('"parentRef":string|null')) {
    return {
      events: [
        {
          ref: 'e1',
          year: 2009,
          title: 'Condition changes',
          description: 'The changed condition takes effect.',
          category: 'technology',
          cause: 'The hypothesis itself.',
          immediateEffects: ['Immediate effect'],
          longTermEffects: ['Long-term effect'],
          affected: ['Industry'],
          confidence: 'medium',
          nature: 'INFERENCE',
        },
        {
          ref: 'e2',
          year: 2012,
          title: 'Substitutes appear',
          description: 'Existing technology is recombined.',
          category: 'economy',
          cause: 'Functional demand persists.',
          immediateEffects: ['Cost pressure'],
          longTermEffects: ['New structure'],
          affected: ['Firms'],
          confidence: 'medium',
          nature: 'INFERENCE',
          parentRef: 'e1',
        },
      ],
    }
  }
  if (has('"isMain":boolean')) {
    return {
      branches: [
        {
          ref: 'b1',
          name: 'Main timeline',
          originYear: 2009,
          originEventRef: 'e1',
          condition: 'The primary reasoning path.',
          summary: 'The main path derived from the divergence.',
          color: '#38bdf8',
          isMain: true,
        },
        {
          ref: 'b2',
          name: 'Alternative branch',
          originYear: 2012,
          originEventRef: 'e2',
          condition: 'A different changed condition.',
          summary: 'The world forks here.',
          color: '#a78bfa',
          isMain: false,
        },
      ],
    }
  }
  if (has('"branchRef":string')) {
    return {
      outcomes: [
        {
          title: 'Outcome A',
          branchRef: 'b1',
          path: ['Condition changes', 'New equilibrium'],
          keyConditions: ['Substitutes mature'],
          mainImpacts: ['Lower efficiency'],
          uncertainty: 'medium',
          uncertaintyReason: 'Timing is unknown.',
          differsFrom: ['Faster than Outcome B'],
        },
      ],
    }
  }
  return {
    worldState: [
      {
        name: 'Substitute maturity',
        domain: 'technology',
        direction: 'unknown',
        note: 'Depends on research investment.',
        confidence: 'low',
      },
    ],
    keyDifferences: ['Reality has the original mechanism.'],
    changedAreas: ['Technology paths'],
    uncertainties: ['Long-run outcome is unknown.'],
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

const mock = createServer(async (req, res) => {
  // The browser sends a CORS preflight because the request is JSON cross-origin.
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders).end()
    return
  }
  if (req.method !== 'POST') {
    res.writeHead(404, corsHeaders).end()
    return
  }

  const mode = new URL(req.url, 'http://x').searchParams.get('mode') ?? 'invalid'
  const body = await readBody(req)

  if (mode === 'hang') {
    // Never respond: the client must hit its own cancel path.
    return
  }
  if (mode === 'error500') {
    res.writeHead(500, { ...corsHeaders, 'Content-Type': 'application/json' })
    res.end('{"error":"boom"}')
    return
  }

  const payload = mode === 'happy' ? happyPhase(body) : { nope: true }
  res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: JSON.stringify(payload) } }] }))
})

await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve))
const port = mock.address().port
console.log(`mock endpoint on ${port}`)

const browser = await chromium.launch({ channel: 'chrome' })
const results = []
const record = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail.replace(/\s+/g, ' ').slice(0, 70)}` : ''}`)
}

async function withPrefs(proxyMode) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 900 } })
  const page = await context.newPage()
  await page.addInitScript((url) => {
    window.localStorage.setItem(
      'what-if-lab:preferences',
      JSON.stringify({
        state: { lang: 'zh', theme: 'dark', ai: { mode: 'proxy', baseUrl: '', apiKey: '', model: 'm', proxyUrl: url } },
        version: 1,
      }),
    )
  }, `http://127.0.0.1:${port}/api/simulate?mode=${proxyMode}`)
  return { context, page }
}

async function submit(page) {
  await page.goto(`${base}/#/lab`, { waitUntil: 'load' })
  await page.waitForSelector('text=/AI 推演|AI simulation/')
  await page.getByLabel(/假设内容/).fill('如果比特币从未诞生？')
  await page.getByRole('button', { name: /生成平行世界/ }).click()
}

// 1) wrong-shaped output must produce a schema error and save nothing
{
  const { context, page } = await withPrefs('invalid')
  await submit(page)
  const alert = page.locator('[role="alert"]')
  await alert.first().waitFor({ state: 'visible', timeout: 30_000 })
  const text = await alert.first().innerText()
  record('invalid schema shows an error', /结构不合法|invalid structure/i.test(text), text)
  record('invalid schema stays on the builder', page.url().includes('#/lab'))

  await page.goto(`${base}/#/library`, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  const saved = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const request = indexedDB.open('what-if-lab')
        request.onsuccess = () => {
          const db = request.result
          if (!db.objectStoreNames.contains('simulations')) return resolve(0)
          const tx = db.transaction('simulations', 'readonly')
          const count = tx.objectStore('simulations').count()
          count.onsuccess = () => resolve(count.result)
          count.onerror = () => resolve(-1)
        }
        request.onerror = () => resolve(-1)
      }),
  )
  record('invalid schema saved nothing', saved === 0, `rows=${saved}`)
  await context.close()
}

// 2) HTTP 500 must surface a network error
{
  const { context, page } = await withPrefs('error500')
  await submit(page)
  const alert = page.locator('[role="alert"]')
  await alert.first().waitFor({ state: 'visible', timeout: 30_000 })
  record('HTTP 500 shows an error', /失败|failed/i.test(await alert.first().innerText()))
  await context.close()
}

// 3) cancelling a hanging request returns to idle without an error dialog
{
  const { context, page } = await withPrefs('hang')
  await submit(page)
  const cancel = page.getByRole('button', { name: /取消生成|Cancel/ })
  await cancel.waitFor({ state: 'visible', timeout: 20_000 })
  await cancel.click({ force: true })
  await page.waitForTimeout(1500)
  record('cancel stops generation', !(await cancel.isVisible().catch(() => false)))
  record('cancel shows no error dialog', (await page.locator('[role="alert"]').count()) === 0)
  await context.close()
}

// 4) a fully valid 5-phase reply must create a real AI world
{
  const { context, page } = await withPrefs('happy')
  await submit(page)
  await page.waitForURL(/#\/world\//, { timeout: 60_000 })
  await page.waitForSelector('text=Mock AI World', { timeout: 20_000 })
  record('happy path creates an AI world', true)
  await context.close()
}

await browser.close()
mock.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length === 0 ? 0 : 1)
