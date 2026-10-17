import { expect, test } from '@playwright/test'

const MAP = /carte de l'afrique/i

const scaleOf = (locator) =>
  locator.evaluate((el) => Number(/scale\(([\d.]+)\)/.exec(el.getAttribute('transform'))[1]))

test('continent → pays → région → subdivision, puis retour', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const map = page.getByRole('group', { name: MAP })
  const viewport = map.locator('g.map-viewport')
  const breadcrumb = page.getByRole('navigation', { name: /fil d'ariane/i })

  await map.locator('path[data-id="CMR"]').click()
  const ouest = map.locator('path[data-level="region"][aria-label="Ouest"]')
  await ouest.waitFor()
  await page.waitForTimeout(1100)
  await ouest.click()

  const subdivisions = map.locator('path[data-level="subregion"]')
  await expect(subdivisions).toHaveCount(8)
  await page.waitForTimeout(1100)
  const regionScale = await scaleOf(viewport)

  const noun = map.locator('path[data-level="subregion"][aria-label="Noun"]')
  await noun.hover()
  await expect(page.getByRole('tooltip')).toContainText('Département · Ouest, Cameroun')

  await noun.click()
  await expect(page.getByRole('complementary', { name: /fiche de la région : noun/i })).toContainText('Rattachée à')
  await expect(breadcrumb).toContainText('Afrique')
  await expect(breadcrumb).toContainText('Ouest')
  await expect(breadcrumb.getByText('Noun')).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => scaleOf(viewport)).toBeGreaterThan(regionScale)

  await page.keyboard.press('Escape')
  await expect(breadcrumb.getByText('Ouest')).toHaveAttribute('aria-current', 'page')

  await breadcrumb.getByRole('button', { name: 'Afrique' }).click()
  await expect(subdivisions).toHaveCount(0)
  await expect.poll(() => scaleOf(viewport)).toBe(1)
})
