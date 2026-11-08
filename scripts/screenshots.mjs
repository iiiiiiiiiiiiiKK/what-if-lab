/**
 * Captures real screenshots from the running production build for the README.
 * Usage: node scripts/screenshots.mjs http://127.0.0.1:4173
 */
import { chromium, devices } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const base = process.argv[2] ?? 'http://127.0.0.1:4173'
const outDir = 'docs/screenshots'

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ channel: 'chrome' })

async function shoot(name, url, { mobile = false, fullPage = true, wait = 900 } = {}) {
  const context = await browser.newContext(
    mobile ? { ...devices['iPhone 13'], channel: 'chrome' } : { viewport: { width: 1440, height: 960 } },
  )
  const page = await context.newPage()
  await page.goto(`${base}${url}`, { waitUntil: 'load' })
  await page.waitForTimeout(wait)
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage })
  await context.close()
  console.log(`saved ${outDir}/${name}.png`)
}

await shoot('01-home', '/#/')
await shoot('02-builder', '/#/lab')
await shoot('03-timeline', '/#/world/ex_bitcoin')
await shoot('04-world-state', '/#/world/ex_bitcoin#state', { fullPage: false })
await shoot('05-library', '/#/library')
await shoot('06-mobile-home', '/#/', { mobile: true, fullPage: false })
await shoot('07-mobile-timeline', '/#/world/ex_bitcoin', { mobile: true, fullPage: false })

// The state/outcome tabs are client-side: click them explicitly for real captures.
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
const page = await context.newPage()
await page.goto(`${base}/#/world/ex_bitcoin`)
await page.waitForTimeout(700)
await page.getByRole('tab', { name: /结局实验室|Outcome Lab/ }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${outDir}/08-outcomes.png`, fullPage: true })
await page.getByRole('tab', { name: /现实对照|Reality/ }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${outDir}/09-reality.png`, fullPage: true })
await page.getByRole('tab', { name: /世界状态|World State/ }).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${outDir}/04-world-state.png`, fullPage: true })
await context.close()

await browser.close()
console.log('done')
