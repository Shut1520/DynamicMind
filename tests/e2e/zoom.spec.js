import { expect, test } from '@playwright/test'

const MAP = /carte de l'afrique/i

const scaleOf = (locator) =>
  locator.evaluate((el) => Number(/scale\(([\d.]+)\)/.exec(el.getAttribute('transform'))[1]))

test('le zoom cadre le pays à gauche de la fiche, puis revient au continent', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const map = page.getByRole('group', { name: MAP })
  const viewport = map.locator('g.map-viewport')
  const kenya = map.locator('path[data-id="KEN"]')

  await kenya.click()

  // Le zoom est animé : on attend qu'il se stabilise.
  await expect.poll(() => scaleOf(viewport)).toBeGreaterThan(3)
  await page.waitForTimeout(1100)

  const panel = await page.getByRole('complementary', { name: /fiche du pays/i }).boundingBox()
  const stage = await page.locator('.map-stage').boundingBox()
  const country = await kenya.boundingBox()
  expect(country.x).toBeGreaterThanOrEqual(stage.x)
  expect(country.x + country.width).toBeLessThanOrEqual(panel.x)
  expect(country.height).toBeGreaterThan(stage.height * 0.6)

  const breadcrumb = page.getByRole('navigation', { name: /fil d'ariane/i })
  await expect(breadcrumb).toContainText('Kenya')

  await page.keyboard.press('Escape')
  await expect.poll(() => scaleOf(viewport)).toBe(1)
  await expect(breadcrumb.getByText('Afrique')).toHaveAttribute('aria-current', 'page')
})

test('le zoom est réellement progressif (images intermédiaires)', async ({ page }) => {
  await page.goto('/')
  const viewport = page.getByRole('group', { name: MAP }).locator('g.map-viewport')

  // On relève l'échelle à chaque image, dans le navigateur, pendant 1,5 s après le clic.
  const sampling = viewport.evaluate(
    (el) =>
      new Promise((done) => {
        const scales = []
        const start = performance.now()
        const sample = () => {
          // translate(x, y) scale(k) : on lit k dans l'attribut, sans le modifier
          // (consolidate() réécrirait l'attribut pendant l'animation).
          scales.push(Number(/scale\(([^)]+)\)/.exec(el.getAttribute('transform'))?.[1] ?? 1))
          if (performance.now() - start < 1500) requestAnimationFrame(sample)
          else done(scales)
        }
        requestAnimationFrame(sample)
      }),
  )
  await page.locator('path[data-id="NGA"]').click()
  const scales = await sampling

  const final = scales.at(-1)
  const intermediate = scales.filter((k) => k > 1.05 && k < final - 0.05)
  expect(final).toBeGreaterThan(2)
  // Au moins une image entre le départ et l'arrivée : ce n'est pas un saut. (Le nombre d'images
  // dépend du moteur : WebKit sans affichage sous Windows n'en produit qu'une dizaine par seconde.)
  expect(intermediate.length).toBeGreaterThanOrEqual(1)
})
