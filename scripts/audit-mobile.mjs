import { chromium, devices } from '@playwright/test'
const base = process.argv[2]
const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ ...devices['iPhone 13'] })
const page = await ctx.newPage()
await page.goto(base + '#/world/ex_bitcoin', { waitUntil: 'load' })
await page.waitForTimeout(1500)

// tap-target audit on the most-used interactive elements
const audit = await page.evaluate(() => {
  const results = { total: 0, small: [] }
  document.querySelectorAll('button, a, input, select, textarea').forEach((el) => {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return
    results.total += 1
    if (r.height < 40) results.small.push(`${el.tagName}:${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24)}=${Math.round(r.height)}px`)
  })
  return results
})
console.log('interactive elements:', audit.total)
console.log('under 40px height:', audit.small.length, audit.small.slice(0, 12).join(' | '))

// author badge geometry on the smallest phone
const ctx2 = await browser.newContext({ viewport: { width: 320, height: 640 }, isMobile: true, hasTouch: true })
const p2 = await ctx2.newPage()
await p2.goto(base + '#/', { waitUntil: 'load' })
await p2.waitForTimeout(800)
const badge = await p2.locator('header a[href="https://x.com/0xkillcoin"]').first().boundingBox()
console.log('320px author badge:', JSON.stringify(badge))
const headerBtns = await p2.evaluate(() => Array.from(document.querySelectorAll('header button')).map((b) => {
  const r = b.getBoundingClientRect(); return `${(b.getAttribute('aria-label')||'?').slice(0,16)}=${Math.round(r.width)}x${Math.round(r.height)}`
}))
console.log('320px header buttons:', headerBtns.join(' | '))
await browser.close()
