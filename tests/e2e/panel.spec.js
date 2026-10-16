import { expect, test } from '@playwright/test'

const MAP = /carte de l'afrique/i
const PANEL = /fiche du pays/i

test('sur ordinateur, le clic ouvre la fiche sur le côté sans redimensionner la carte', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const map = page.getByRole('group', { name: MAP })
  const before = await map.boundingBox()

  await map.locator('path[data-id="KEN"]').click()

  const panel = page.getByRole('complementary', { name: PANEL })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('heading', { name: 'Kenya' })).toBeFocused()
  await expect(panel).toContainText('Nairobi')

  const after = await map.boundingBox()
  expect(after).toEqual(before)

  const stage = await page.locator('.map-stage').boundingBox()
  const box = await panel.boundingBox()
  expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width)
  expect(box.x).toBeGreaterThan(stage.x + stage.width / 2)

  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
})

test.describe('sur mobile', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true })

  test('le double tap ouvre la fiche sous la carte, ✕ la ferme', async ({ page }) => {
    await page.goto('/')
    const country = page.getByRole('group', { name: MAP }).locator('path[data-id="COD"]')

    await country.tap()
    await country.tap()

    const panel = page.getByRole('complementary', { name: PANEL })
    await expect(panel).toBeVisible()

    const stage = await page.locator('.map-stage').boundingBox()
    const box = await panel.boundingBox()
    expect(box.y).toBeGreaterThanOrEqual(stage.y + stage.height)

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(375)

    await panel.getByRole('button', { name: /fermer/i }).tap()
    await expect(panel).toBeHidden()
  })
})
