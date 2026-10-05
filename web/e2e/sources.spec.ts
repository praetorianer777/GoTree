import { expect, test } from '@playwright/test'
import { expectAccessible, login, unique } from './helpers'

test('cite a source on a birth and find it from the source', async ({ page }) => {
  await login(page)
  const name = unique('Cited', page)
  const title = `Kirchenbuch ${name}`

  const res = await page.request.post('/api/persons', { data: { givenNames: 'Anna', surname: name } })
  const person = (await res.json()) as { id: number }
  await page.goto(`/people/${person.id}`)

  await page.getByRole('button', { name: /^\+ Event/ }).click()
  const dialog = page.getByRole('dialog', { name: 'New life event' })
  await dialog.getByLabel('Date').fill('1850')
  await dialog.getByRole('searchbox', { name: 'Source' }).fill(title)
  await dialog.getByRole('button', { name: `Create source “${title}”` }).click()
  await dialog.getByLabel('Where in the source').fill('S. 12, Nr. 34')
  await dialog.getByLabel('How reliable?').selectOption({ label: 'primary, direct evidence' })
  await dialog.getByRole('button', { name: '+ Cite this source' }).click()
  await expectAccessible(page)
  await dialog.getByRole('button', { name: /^Save/ }).click()
  await expect(dialog).toBeHidden()

  const citation = page.getByRole('list', { name: 'Sources for Birth' }).getByRole('link', { name: title })
  await expect(citation).toBeVisible()
  await citation.click()

  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible()
  await expect(page.getByText('S. 12, Nr. 34')).toBeVisible()
  await page.getByRole('link', { name: `Birth of Anna ${name}` }).click()
  await expect(page.getByRole('heading', { level: 1, name: `Anna ${name}` })).toBeVisible()

  await page.goto('/sources')
  await page.getByRole('searchbox', { name: 'Search sources' }).fill(name)
  await expect(page.getByRole('link', { name: new RegExp(title) })).toContainText('1 citation')
  await expectAccessible(page)
})
