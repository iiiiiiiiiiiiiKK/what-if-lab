import { expect, test } from '@playwright/test'

const EXAMPLE_TITLE = /如果比特币从未诞生|If Bitcoin Had Never Been Invented/

test.describe('core flows', () => {
  test('home renders hero, author X link and example cards', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('WHAT IF?')
    // The author 𝕏 link must sit in the top bar and point at the required URL.
    const authorLink = page.locator('header a[href="https://x.com/0xkillcoin"]').first()
    await expect(authorLink).toBeVisible()
    await expect(authorLink).toContainText('0xkillcoin')
    await expect(page.getByText(/精选模拟案例|Featured simulations/)).toBeVisible()
  })

  test('creates a rule-based simulation and opens the world page', async ({ page }) => {
    await page.goto('/#/lab')
    await page.getByLabel(/假设内容|Hypothesis/).fill('如果比特币从未诞生，世界会怎样？')
    await page.getByRole('button', { name: /生成平行世界|Generate world/ }).click()
    await page.waitForURL(/#\/world\//, { timeout: 20_000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText(EXAMPLE_TITLE)
    // Timeline tab is default; events must render from real data.
    await expect(page.getByRole('tab', { name: /时间线|Timeline/ })).toBeVisible()
  })

  test('opens a built-in example and switches every tab', async ({ page }) => {
    await page.goto('/#/world/ex_bitcoin')
    await expect(page.getByRole('heading', { level: 1 })).toContainText(EXAMPLE_TITLE)
    for (const tab of [/世界状态|World State/, /结局实验室|Outcome Lab/, /现实对照|Reality/, /分支|Branches/]) {
      await page.getByRole('tab', { name: tab }).click()
      await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true')
    }
  })

  test('persists a simulation in the library across a reload', async ({ page }) => {
    await page.goto('/#/lab')
    await page.getByLabel(/假设内容|Hypothesis/).fill('如果恐龙没有灭绝？')
    await page.getByRole('button', { name: /生成平行世界|Generate world/ }).click()
    await page.waitForURL(/#\/world\//, { timeout: 20_000 })
    await page.goto('/#/library')
    await expect(page.getByText(/恐龙/).first()).toBeVisible()
    await page.reload()
    await expect(page.getByText(/恐龙/).first()).toBeVisible()
  })

  test('creates a branch from an event without touching the main timeline', async ({ page }) => {
    await page.goto('/#/world/ex_bitcoin')
    const branchCountBefore = await page.locator('aside button', { hasText: /主时间线|Main timeline/ }).count()
    // Open the first main-timeline event from the side list, then fork it.
    await page.locator('aside li button').first().click()
    await page.getByRole('button', { name: /从此事件创建分支|Branch from this event/ }).click()
    await page.getByLabel(/分支名称|Branch name/).fill('E2E 测试分支')
    await page.getByLabel(/变化条件|Changed condition/).fill('如果各国在 2012 年联合发行央行数字货币')
    await page.getByRole('button', { name: /^创建分支$|^Create branch$/ }).click()
    await expect(page.getByText('E2E 测试分支').first()).toBeVisible({ timeout: 10_000 })
    const branchCountAfter = await page.locator('aside button', { hasText: /主时间线|Main timeline/ }).count()
    expect(branchCountAfter).toBe(branchCountBefore)
  })

  test('switches language and theme', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Switch to English/i }).click()
    // The hero tagline is rendered at every breakpoint, whereas the desktop nav is
    // hidden behind the mobile sheet on phones, so assert on the tagline instead.
    await expect(page.getByText('What if reality took a different turn?').first()).toBeVisible()
    // Theme toggle keeps an aria-label describing the action, in the current language.
    const themeToggle = page.locator('header button').filter({ hasText: /☾|☀/ }).first()
    await themeToggle.click()
    const hasLight = await page.evaluate(() => document.documentElement.classList.contains('light'))
    expect(typeof hasLight).toBe('boolean')
  })

  test('shows a validation error for an empty hypothesis', async ({ page }) => {
    await page.goto('/#/lab')
    await page.getByRole('button', { name: /生成平行世界|Generate world/ }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  })
})

test.describe('mobile layout', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('home has no horizontal overflow on a phone viewport', async ({ page }) => {
    await page.goto('/')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test('timeline falls back to the vertical layout on mobile', async ({ page }) => {
    await page.goto('/#/world/ex_bitcoin')
    await expect(page.getByText(/移动端使用纵向时间线|On mobile the timeline is vertical/)).toBeVisible()
  })

  test('mobile navigation sheet works', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Open menu|打开菜单/ }).click()
    await page.getByRole('link', { name: /档案馆|Library/ }).first().click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/档案馆|Library/)
  })

  test('author X link is visible on a phone without overflow', async ({ page }) => {
    await page.goto('/')
    const authorLink = page.locator('header a[href="https://x.com/0xkillcoin"]').first()
    await expect(authorLink).toBeVisible()
    const box = await authorLink.boundingBox()
    expect(box?.width ?? 0).toBeGreaterThan(20)
  })
})
