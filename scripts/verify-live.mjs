/**
 * Verifies the DEPLOYED site (not a local build) in a real browser.
 * Usage: node scripts/verify-live.mjs https://user.github.io/what-if-lab/
 */
import { chromium, devices } from '@playwright/test'

const base = process.argv[2]
if (!base) {
  console.error('usage: node scripts/verify-live.mjs <base-url>')
  process.exit(1)
}

const proxy = process.env.REA_PROXY ?? process.env.HTTPS_PROXY ?? undefined
const results = []
function record(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({
  channel: 'chrome',
  proxy: proxy ? { server: proxy } : undefined,
})

async function run(label, contextOptions, checks) {
  const context = await browser.newContext(contextOptions)
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))

  try {
    await checks(page)
    record(`${label}: no console errors`, consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
  } catch (error) {
    record(`${label}: checks`, false, error.message.split('\n')[0])
  } finally {
    await context.close()
  }
}

await run('desktop', { viewport: { width: 1440, height: 960 } }, async (page) => {
  const response = await page.goto(base, { waitUntil: 'load', timeout: 45_000 })
  record('desktop: HTTP 200', response?.status() === 200, String(response?.status()))
  await page.waitForSelector('text=WHAT IF?', { timeout: 20_000 })
  record('desktop: hero renders', true)

  const author = page.locator('header a[href="https://x.com/0xkillcoin"]').first()
  await author.waitFor({ state: 'visible', timeout: 10_000 })
  record('desktop: author X link visible', (await author.getAttribute('href')) === 'https://x.com/0xkillcoin')

  // example world renders from deployed data
  await page.goto(`${base}#/world/ex_bitcoin`, { waitUntil: 'load' })
  await page.waitForSelector('text=如果比特币从未诞生', { timeout: 20_000 })
  record('desktop: example world opens', true)

  // tabs
  for (const name of [/世界状态/, /结局实验室/, /现实对照/, /分支/]) {
    await page.getByRole('tab', { name }).click()
    await page.waitForTimeout(250)
  }
  record('desktop: all tabs switch', true)

  // create a simulation end-to-end on production
  await page.goto(`${base}#/lab`, { waitUntil: 'load' })
  await page.getByLabel(/假设内容/).fill('如果互联网晚 20 年出现？')
  await page.getByRole('button', { name: /生成平行世界/ }).click()
  await page.waitForURL(/#\/world\//, { timeout: 30_000 })
  record('desktop: creates a world on production', true)

  // library persists
  await page.goto(`${base}#/library`, { waitUntil: 'load' })
  await page.waitForSelector('text=互联网', { timeout: 15_000 })
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('text=互联网', { timeout: 15_000 })
  record('desktop: library persists after reload', true)
})

await run('mobile', { ...devices['iPhone 13'] }, async (page) => {
  await page.goto(base, { waitUntil: 'load', timeout: 45_000 })
  await page.waitForSelector('text=WHAT IF?', { timeout: 20_000 })
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  record('mobile: no horizontal overflow', overflow <= 1, `overflow=${overflow}`)
  const author = page.locator('header a[href="https://x.com/0xkillcoin"]').first()
  await author.waitFor({ state: 'visible', timeout: 10_000 })
  record('mobile: author X link visible', true)

  await page.goto(`${base}#/world/ex_bitcoin`, { waitUntil: 'load' })
  await page.waitForSelector('text=/移动端使用纵向时间线/', { timeout: 20_000 })
  record('mobile: vertical timeline', true)
})

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
process.exit(failed.length === 0 ? 0 : 1)
