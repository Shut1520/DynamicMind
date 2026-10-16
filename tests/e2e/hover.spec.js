import { expect, test } from '@playwright/test'

const MAP = /carte de l'afrique/i

test('le survol colore le pays et affiche son infobulle dans le cadre', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const map = page.getByRole('group', { name: MAP })
  const senegal = map.locator('path[data-id="SEN"]')

  const idleFill = await senegal.evaluate((el) => getComputedStyle(el).fill)
  await senegal.hover()

  const tooltip = page.getByRole('tooltip')
  await expect(tooltip).toContainText('Sénégal')
  await expect(tooltip).toContainText('Dakar')
  await expect(senegal).toHaveClass(/is-active/)
  await expect.poll(() => senegal.evaluate((el) => getComputedStyle(el).fill)).not.toBe(idleFill)

  const stage = await page.getByRole('main').boundingBox()
  const box = await tooltip.boundingBox()
  expect(box.x).toBeGreaterThanOrEqual(stage.x)
  expect(box.x + box.width).toBeLessThanOrEqual(stage.x + stage.width + 1)

  await page.mouse.move(stage.x + 5, stage.y + 5)
  await expect(tooltip).toBeHidden()
})

test('les petites îles sont survolables grâce à leur repère', async ({ page }) => {
  await page.goto('/')

  await page.locator('circle.map-marker[data-id="SYC"]').hover()

  await expect(page.getByRole('tooltip')).toContainText('Seychelles')
})

test.describe('sur écran tactile', () => {
  test.use({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true })

  test('un tap affiche l’infobulle, un tap sur l’océan la ferme', async ({ page }) => {
    await page.goto('/')
    const map = page.getByRole('group', { name: MAP })

    await map.locator('path[data-id="COD"]').tap()
    await expect(page.getByRole('tooltip')).toContainText('République démocratique du Congo')

    const box = await map.boundingBox()
    await page.touchscreen.tap(box.x + 8, box.y + box.height - 8)
    await expect(page.getByRole('tooltip')).toBeHidden()
  })
})
