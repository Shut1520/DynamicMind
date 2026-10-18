import { expect, test } from '@playwright/test'

// Parcours complets, du continent à la subdivision et retour, avec chaque moyen d'interaction.
const MAP = /carte de l'afrique/i
const MAX_TAB_PRESSES = 150

/** Appuie sur Tab (ou Maj+Tab) jusqu'à atteindre l'élément voulu : prouve qu'il est accessible au clavier. */
async function tabTo(page, label, { backwards = false } = {}) {
  const key = backwards ? 'Shift+Tab' : 'Tab'
  for (let presses = 0; presses < MAX_TAB_PRESSES; presses += 1) {
    await page.keyboard.press(key)
    const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
    if (focused === label) return
  }
  throw new Error(`« ${label} » inaccessible en ${MAX_TAB_PRESSES} appuis sur ${key}`)
}

const focusedName = (page) => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent)

test('au clavier seul : Afrique → Cameroun → Ouest → Menoua, puis Échap jusqu’au continent', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  // On attend la carte : avant, Tab ferait sortir le focus de la page.
  await page.getByRole('group', { name: MAP }).locator('path[data-id="CMR"]').waitFor()
  const breadcrumb = page.getByRole('navigation', { name: /fil d'ariane/i })
  const tooltip = page.getByRole('tooltip')

  await tabTo(page, 'Cameroun')
  await expect(tooltip).toContainText('Yaoundé')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Cameroun' })).toBeFocused()
  // Les régions se chargent à l'ouverture : on attend qu'elles soient affichées pour tabuler.
  await page.locator('path[data-level="region"][aria-label="Ouest"]').waitFor()

  // Les régions suivent la carte dans l'ordre de tabulation : on y revient depuis la fiche.
  await tabTo(page, 'Ouest', { backwards: true })
  await expect(tooltip).toContainText('Ouest')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Ouest' })).toBeFocused()
  await page.locator('path[data-level="subregion"][aria-label="Menoua"]').waitFor()

  await tabTo(page, 'Menoua', { backwards: true })
  await page.keyboard.press(' ')
  await expect(page.getByRole('heading', { name: 'Menoua' })).toBeFocused()
  await expect(breadcrumb.getByText('Menoua')).toHaveAttribute('aria-current', 'page')

  for (const level of ['Ouest', 'Cameroun', 'Afrique']) {
    await page.keyboard.press('Escape')
    await expect(breadcrumb.getByText(level)).toHaveAttribute('aria-current', 'page')
  }
  await expect(page.getByRole('complementary')).toHaveCount(0)
  // Le focus revient sur la carte, là où le parcours a commencé.
  expect(await focusedName(page)).toBe('Cameroun')
})

test.describe('au doigt, sur mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('double tap à chaque niveau jusqu’à la subdivision, puis retour par le fil d’Ariane', async ({ page }) => {
    await page.goto('/')
    const map = page.getByRole('group', { name: MAP })
    const breadcrumb = page.getByRole('navigation', { name: /fil d'ariane/i })
    const openByDoubleTap = async (locator, expectedHeading) => {
      await locator.tap()
      await expect(page.getByRole('tooltip')).toContainText(expectedHeading)
      await locator.tap()
      await expect(page.getByRole('heading', { name: expectedHeading })).toBeVisible()
      await page.waitForTimeout(1100)
    }

    await openByDoubleTap(map.locator('path[data-id="CMR"]'), 'Cameroun')
    await openByDoubleTap(map.locator('path[data-level="region"][aria-label="Ouest"]'), 'Ouest')
    await openByDoubleTap(map.locator('path[data-level="subregion"][aria-label="Menoua"]'), 'Menoua')
    await expect(page.getByRole('complementary', { name: /menoua/i })).toContainText('Rattachée à')

    await breadcrumb.getByRole('button', { name: /revenir/i }).tap()
    await expect(breadcrumb.getByText('Ouest')).toHaveAttribute('aria-current', 'page')
    await breadcrumb.getByRole('button', { name: 'Afrique' }).tap()
    await expect(map.locator('path[data-level="region"]')).toHaveCount(0)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(390)
  })
})

test.describe('avec « réduire les animations »', () => {
  test.use({ reducedMotion: 'reduce' })

  test('le zoom saute directement à la cible, sans image intermédiaire', async ({ page }) => {
    await page.goto('/')
    const map = page.getByRole('group', { name: MAP })
    const nigeria = map.locator('path[data-id="NGA"]')
    await nigeria.waitFor()
    const viewport = map.locator('g.map-viewport')
    // On enregistre chaque changement de la transformation, quel que soit le rythme des images.
    await viewport.evaluate((el) => {
      window.__scales = []
      new MutationObserver(() => window.__scales.push(Number(/scale\(([^)]+)\)/.exec(el.getAttribute('transform'))?.[1] ?? 1))).observe(el, {
        attributeFilter: ['transform'],
      })
    })

    await nigeria.click()
    await expect(page.getByRole('heading', { name: 'Nigeria' })).toBeVisible()
    await page.waitForTimeout(800)
    const scales = await page.evaluate(() => window.__scales)

    // Un seul changement, directement vers la cible : aucune étape intermédiaire.
    expect(scales).toHaveLength(1)
    expect(scales[0]).toBeGreaterThan(2)
  })
})
