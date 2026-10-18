import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Audit automatique (axe-core, WCAG 2.1 A et AA) à chaque niveau de la carte.
const MAP = /carte de l'afrique/i
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const SETTLE_MS = 1100

// Trois analyses axe par test : bien plus lent que les autres parcours, surtout sous Firefox.
test.beforeEach(() => test.slow())

async function expectNoViolations(page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
  const summary = violations.map(({ id, help, nodes }) => `${id} (${nodes.length}) : ${help}`)
  expect(summary).toEqual([])
}

for (const colorScheme of ['light', 'dark']) {
  test.describe(`thème ${colorScheme === 'light' ? 'clair' : 'sombre'}`, () => {
    test.use({ colorScheme })

    test('continent, pays avec sa fiche, puis subdivision avec son infobulle', async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/')
      const map = page.getByRole('group', { name: MAP })
      await map.locator('path[data-id="CMR"]').waitFor()
      await expectNoViolations(page)

      await map.locator('path[data-id="CMR"]').click()
      await page.waitForTimeout(SETTLE_MS)
      await expectNoViolations(page)

      await map.locator('path[data-level="region"][aria-label="Ouest"]').click()
      await page.waitForTimeout(SETTLE_MS)
      await map.locator('path[data-level="subregion"][aria-label="Menoua"]').hover()
      await expect(page.getByRole('tooltip')).toBeVisible()
      await expectNoViolations(page)
    })
  })
}

test.describe('sur mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('fiche sous la carte', async ({ page }) => {
    await page.goto('/')
    const kenya = page.getByRole('group', { name: MAP }).locator('path[data-id="KEN"]')
    await kenya.tap()
    await kenya.tap()
    await expect(page.getByRole('complementary')).toBeVisible()
    await page.waitForTimeout(SETTLE_MS)
    await expectNoViolations(page)
  })
})
