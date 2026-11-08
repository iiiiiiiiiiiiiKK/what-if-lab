import { chromium, devices } from '@playwright/test'
const base = process.argv[2]
const browser = await chromium.launch({ channel: 'chrome' })
const routes = ['#/', '#/lab', '#/world/ex_bitcoin', '#/library', '#/community', '#/settings', '#/nope-404']
const devicesToTest = [
  { label: 'desktop', opts: { viewport: { width: 1440, height: 960 } } },
  { label: 'iphone', opts: { ...devices['iPhone 13'] } },
]
let problems = 0
for (const d of devicesToTest) {
  const ctx = await browser.newContext(d.opts)
  const page = await ctx.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
  for (const r of routes) {
    errors.length = 0
    await page.goto(base + r, { waitUntil: 'load' })
    await page.waitForTimeout(900)
    const h1 = await page.locator('h1, h2').first().innerText().catch(() => '(none)')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    const ok = errors.length === 0 && overflow <= 1
    if (!ok) problems++
    console.log(`${ok ? 'PASS' : 'FAIL'} ${d.label.padEnd(8)} ${r.padEnd(22)} h="${h1.slice(0, 30)}" overflow=${overflow} errors=${errors.length}`)
  }
  await ctx.close()
}
await browser.close()
console.log(problems === 0 ? '\nALL ROUTES CLEAN' : `\n${problems} PROBLEM ROUTE(S)`)
