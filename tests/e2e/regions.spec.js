import { expect, test } from '@playwright/test'

const MAP = /carte de l'afrique/i

const scaleOf = (locator) =>
  locator.evaluate((el) => Number(/scale\(([\d.]+)\)/.exec(el.getAttribute('transform'))[1]))

test('pays → régions → région → retour au pays', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const map = page.getByRole('group', { name: MAP })
  const viewport = map.locator('g.map-viewport')
  const breadcrumb = page.getByRole('navigation', { name: /fil d'ariane/i })

  await map.locator('path[data-id="CMR"]').click()
  const regions = map.locator('path[data-level="region"]')
  await expect(regions).toHaveCount(10)
  await page.waitForTimeout(1100)
  const countryScale = await scaleOf(viewport)

  // Région compacte : le centre de sa boîte englobante est bien dans la région (ce n'est pas le cas de l'Extrême-Nord).
  const east = map.locator('path[data-level="region"][aria-label="Est"]')
  await east.hover()
  await expect(page.getByRole('tooltip')).toContainText('Bertoua')

  await east.click()
  await expect(page.getByRole('complementary', { name: /fiche de la région/i })).toContainText('Bertoua')
  await expect(breadcrumb).toContainText('Est')
  await expect.poll(() => scaleOf(viewport)).toBeGreaterThan(countryScale * 1.5)

  await page.keyboard.press('Escape')
  await expect(page.getByRole('complementary', { name: /fiche du pays/i })).toContainText('Yaoundé')
  await expect(breadcrumb.getByText('Cameroun')).toHaveAttribute('aria-current', 'page')
})

test('une région introuvable affiche une erreur discrète avec « Réessayer »', async ({ page }) => {
  await page.route('**/geo/adm1/GAB.topo.json', (route) => route.fulfill({ status: 500, body: 'erreur' }))
  await page.goto('/')

  await page.getByRole('group', { name: MAP }).locator('path[data-id="GAB"]').click()

  const alert = page.getByRole('alert')
  await expect(alert).toContainText(/régions indisponibles/i)
  await expect(alert.getByRole('button', { name: /réessayer/i })).toBeVisible()
  await expect(page.getByRole('complementary', { name: /fiche du pays/i })).toContainText('Libreville')
})
