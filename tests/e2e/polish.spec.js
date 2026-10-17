import { expect, test } from '@playwright/test'

const MAP = /carte de l'afrique/i

test('les pays en retrait sont estompés sans « opacity » (coûteux pendant le zoom)', async ({ page }) => {
  await page.goto('/')
  const map = page.getByRole('group', { name: MAP })
  await map.locator('path[data-id="KEN"]').click()

  const dimmed = map.locator('path[data-id="NGA"]')
  await expect(dimmed).toHaveClass(/is-dimmed/)
  // L'estompage est animé : on attend la valeur finale.
  const style = () =>
    dimmed.evaluate((el) => {
      const computed = getComputedStyle(el)
      return { opacity: computed.opacity, fillOpacity: computed.fillOpacity }
    })
  await expect.poll(style).toEqual({ opacity: '1', fillOpacity: '0.35' })
})

test('un survol prolongé pré-charge les régions avant le clic', async ({ page }) => {
  await page.goto('/')
  const nigeria = page.getByRole('group', { name: MAP }).locator('path[data-id="NGA"]')
  const prefetched = page.waitForRequest((request) => request.url().endsWith('/geo/adm1/NGA.topo.json'))

  await nigeria.hover()

  await prefetched
})

test('le thème choisi s’applique et survit au rechargement', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
  const lightBackground = await background()

  await page.getByRole('group', { name: 'Thème' }).getByRole('button', { name: 'Sombre' }).click()
  await expect.poll(background).not.toBe(lightBackground)

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.getByRole('button', { name: 'Sombre' })).toHaveAttribute('aria-pressed', 'true')
  expect(await background()).not.toBe(lightBackground)
})
