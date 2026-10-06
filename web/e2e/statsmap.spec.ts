import { expect, test } from '@playwright/test'
import { expectAccessible, login, unique } from './helpers'

// A transparent 1×1 PNG, so the map never needs the internet.
const tile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

test('statistics and the migration map', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.fulfill({ contentType: 'image/png', body: tile }))
  await login(page)
  const surname = unique('Wander', page)
  const city = await (await page.request.post('/api/places', { data: { name: `Bremen${surname}`, lat: 53.08, lng: 8.8 } })).json()
  const port = await (await page.request.post('/api/places', { data: { name: `NewYork${surname}`, lat: 40.71, lng: -74.0 } })).json()
  const fritz = await (await page.request.post('/api/persons', { data: { givenNames: 'Fritz', surname, sex: 'M' } })).json()
  for (const [type, date, placeId] of [
    ['BIRT', '3 MAR 1850', city.id],
    ['EMIG', '1880', port.id],
    ['DEAT', '1920', port.id],
  ]) {
    await page.request.post('/api/events', { data: { personId: fritz.id, type, date, placeId } })
  }

  await page.goto('/stats')
  await expect(page.getByRole('region', { name: 'Surnames' }).getByText(`${surname}, 1 person`)).toBeAttached()
  await expect(page.getByRole('region', { name: 'Lifespan by decade of birth' }).getByRole('table')).toBeVisible()
  await expectAccessible(page)

  await page.goto('/map')
  await page.getByLabel('Show').selectOption('descendants')
  await page.getByRole('searchbox', { name: 'Person' }).fill(`Fritz ${surname}`)
  await page.getByRole('button', { name: new RegExp(`^Fritz ${surname}`) }).click()
  const slider = page.getByRole('slider', { name: /Year/ })
  await expect(slider).toHaveAttribute('min', '1850')
  await expect(slider).toHaveAttribute('max', '1920')
  await expect(page.getByRole('row', { name: new RegExp(`Bremen${surname}.*Fritz`) })).toBeVisible()
  // Leaflet draws the place as a circle on the map.
  await expect(page.locator('.leaflet-overlay-pane path.leaflet-interactive')).toHaveCount(1)
  await expectAccessible(page)

  await slider.fill('1900')
  await expect(page.getByRole('heading', { name: 'Who was where in 1900' })).toBeVisible()
  await expect(page.getByRole('row', { name: new RegExp(`NewYork${surname}.*Fritz`) })).toBeVisible()
})
