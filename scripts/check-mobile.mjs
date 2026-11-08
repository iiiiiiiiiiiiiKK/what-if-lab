import { chromium, devices } from '@playwright/test'
const base = process.argv[2]
const browser = await chromium.launch({ channel: 'chrome' })
const ctx = await browser.newContext({ ...devices['iPhone 13'] })
const page = await ctx.newPage()
const routes = ['#/', '#/lab', '#/world/ex_bitcoin', '#/library', '#/community', '#/settings', '#/world/ex_bitcoin#nope']
for (const r of routes) {
  await page.goto(base + r, { waitUntil: 'load' })
  await page.waitForTimeout(1200)
  const m = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - window.innerWidth,
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
  }))
  console.log(`${r.padEnd(28)} overflow=${m.overflow} (scrollWidth=${m.sw}, innerWidth=${m.iw})`)
  // find offending elements when overflowing
  if (m.overflow > 1) {
    const bad = await page.evaluate(() => {
      const out = []
      document.querySelectorAll('*').forEach((el) => {
        const rect = el.getBoundingClientRect()
        if (rect.right > window.innerWidth + 1 && rect.width > 0) {
          out.push(`${el.tagName}.${String(el.className).slice(0, 40)} right=${Math.round(rect.right)}`)
        }
      })
      return out.slice(0, 6)
    })
    console.log('   offenders:', bad.join(' || '))
  }
}
await browser.close()
