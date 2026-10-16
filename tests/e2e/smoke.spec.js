import { expect, test } from '@playwright/test'

const VIEWPORTS = [
  { name: 'bureau', width: 1440, height: 900 },
  { name: 'tablette', width: 820, height: 1180 },
  { name: 'mobile', width: 375, height: 740 },
]

test("la page d'accueil s'affiche", async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Carte de l'Afrique/)
  await expect(page.getByRole('heading', { name: /carte de l'afrique/i })).toBeVisible()
})

for (const viewport of VIEWPORTS) {
  test(`la carte occupe son cadre sans déborder (${viewport.name})`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await page.goto('/')

    const map = page.getByRole('group', { name: /carte de l'afrique/i })
    await expect(map).toBeVisible()
    await expect(map.locator('path.map-region')).toHaveCount(55)

    const stage = await page.getByRole('main').boundingBox()
    const continent = await map.locator('g.map-layer').boundingBox()
    expect(continent.width).toBeGreaterThan(stage.width * 0.5)
    expect(continent.x).toBeGreaterThanOrEqual(stage.x)
    expect(continent.x + continent.width).toBeLessThanOrEqual(stage.x + stage.width + 1)

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(viewport.width)
  })
}
