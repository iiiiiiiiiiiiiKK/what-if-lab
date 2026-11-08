import { chromium } from '@playwright/test'
const base = process.argv[2]
const browser = await chromium.launch({ channel: 'chrome' })
const out = []

// 1) light theme really applies and text stays readable
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(base, { waitUntil: 'load' })
  const before = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const toggle = page.locator('header button').filter({ hasText: /☾/ }).first()
  await toggle.click()
  await page.waitForTimeout(500)
  const after = await page.evaluate(() => ({
    bg: getComputedStyle(document.body).backgroundColor,
    color: getComputedStyle(document.body).color,
    cls: document.documentElement.className,
  }))
  out.push(`light: ${before} -> ${after.bg}, text=${after.color}, class="${after.cls}"`)
  await ctx.close()
}

// 2) deep link reload directly on a world keeps working (hash router)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}#/world/ex_rome`, { waitUntil: 'load' })
  await page.waitForSelector('text=如果罗马帝国没有衰落', { timeout: 20000 })
  await page.reload({ waitUntil: 'load' })
  await page.waitForSelector('text=如果罗马帝国没有衰落', { timeout: 20000 })
  out.push('deep link: reload on #/world/ex_rome works')
  await ctx.close()
}

// 3) import/export round-trip on production (real IndexedDB)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true })
  const page = await ctx.newPage()
  await page.goto(`${base}#/lab`, { waitUntil: 'load' })
  await page.getByLabel(/假设内容/).fill('如果人类从未发现石油？')
  await page.getByRole('button', { name: /生成平行世界/ }).click()
  await page.waitForURL(/#\/world\//, { timeout: 30000 })
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: /导出 JSON/ }).click()
  const download = await downloadPromise
  const path = await download.path()
  out.push(`export: ${download.suggestedFilename()}`)
  await page.goto(`${base}#/library`, { waitUntil: 'load' })
  await page.setInputFiles('input[type=file]', path)
  await page.waitForTimeout(1500)
  const cards = await page.locator('li.panel').count()
  out.push(`import: library cards after import = ${cards}`)
  await ctx.close()
}

// 4) settings page persists AI config choice (but never uploads)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.goto(`${base}#/settings`, { waitUntil: 'load' })
  await page.getByRole('button', { name: /服务端代理/ }).click()
  await page.waitForTimeout(300)
  const stored = await page.evaluate(() => localStorage.getItem('what-if-lab:preferences'))
  out.push(`settings: prefs stored = ${stored ? 'yes' : 'no'}`)
  await ctx.close()
}

console.log(out.join('\n'))
await browser.close()
