import { chromium } from '@playwright/test'
const base = process.argv[2]
const browser = await chromium.launch({ channel: 'chrome' })
const widths = [320, 360, 375, 414, 768, 1024, 1440]
const routes = ['#/', '#/lab', '#/world/ex_bitcoin', '#/library', '#/settings']
for (const w of widths) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: w < 768, hasTouch: w < 768 })
  const page = await ctx.newPage()
  const row = []
  for (const r of routes) {
    await page.goto(base + r, { waitUntil: 'load' })
    await page.waitForTimeout(800)
    const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    row.push(`${r.replace('#/', '') || 'home'}:${o}`)
  }
  console.log(`w=${String(w).padEnd(5)} ${row.join('  ')}`)
  await ctx.close()
}
await browser.close()
