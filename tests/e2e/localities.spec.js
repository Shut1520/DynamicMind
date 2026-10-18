import { expect, test } from '@playwright/test'

const MAP = /carte de l'afrique/i
const SETTLE_MS = 1100

// Lecture de k dans « translate(x,y) scale(k) », sans modifier l'attribut (contrairement à consolidate()).
const scaleOf = (locator) => locator.evaluate((el) => Number(/scale\(([^)]+)\)/.exec(el.getAttribute('transform'))?.[1] ?? 1))

async function openDrcRegion(page, name) {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const map = page.getByRole('group', { name: MAP })
  await map.locator('path[data-id="COD"]').click()
  const region = map.locator(`path[data-level="region"][aria-label="${name}"]`)
  await region.waitFor()
  await page.waitForTimeout(SETTLE_MS)
  await region.click()
  return map
}

test('Kinshasa : les communes, jusqu’à la plus petite, sont cadrées lisiblement', async ({ page }) => {
  const map = await openDrcRegion(page, 'Kinshasa')
  const communes = map.locator('path[data-level="subregion"]')
  await expect(communes).toHaveCount(24)
  await page.waitForTimeout(SETTLE_MS)

  const lingwala = map.locator('path[data-level="subregion"][aria-label="Lingwala"]')
  await lingwala.hover()
  await expect(page.getByRole('tooltip')).toContainText('Commune · Kinshasa')

  await lingwala.click()
  await expect(page.getByRole('complementary', { name: /fiche de la région : lingwala/i })).toContainText(
    'OpenStreetMap',
  )
  await page.waitForTimeout(SETTLE_MS)
  const box = await lingwala.boundingBox()
  expect(Math.max(box.width, box.height)).toBeGreaterThan(300)
})

test('Sud-Kivu → Mwenga → chefferie de Luindi, puis retour', async ({ page }) => {
  const map = await openDrcRegion(page, 'Sud-Kivu')
  const viewport = map.locator('g.map-viewport')
  const breadcrumb = page.getByRole('navigation', { name: /fil d'ariane/i })

  const mwenga = map.locator('path[data-level="subregion"][aria-label="Mwenga"]')
  await mwenga.waitFor()
  await page.waitForTimeout(SETTLE_MS)
  await mwenga.click()

  const localities = map.locator('path[data-level="locality"]')
  await expect(localities).toHaveCount(6)
  await page.waitForTimeout(SETTLE_MS)
  const territoryScale = await scaleOf(viewport)

  const luindi = map.locator('path[data-level="locality"][aria-label="Luindi"]')
  await luindi.hover()
  await expect(page.getByRole('tooltip')).toContainText('Chefferie · Mwenga')
  await luindi.click()

  await expect(page.getByRole('complementary', { name: /fiche de la région : luindi/i })).toContainText('Rattachée à')
  await expect(breadcrumb.getByText('Luindi')).toHaveAttribute('aria-current', 'page')
  await expect.poll(() => scaleOf(viewport)).toBeGreaterThan(territoryScale)

  await page.keyboard.press('Escape')
  await expect(breadcrumb.getByText('Mwenga')).toHaveAttribute('aria-current', 'page')
  await breadcrumb.getByRole('button', { name: 'Afrique' }).click()
  await expect(localities).toHaveCount(0)
})
