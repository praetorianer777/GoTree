import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

export async function login(page: Page) {
  await page.goto('/')
  await page.getByLabel('Username').fill('admin')
  await page.getByLabel('Password').fill('e2e correct horse')
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
}

/** Fails with the list of WCAG 2.2 AA violations on the current page. */
export async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

/** A name that is unique per test run and project, since all share one database. */
export function unique(base: string, page: Page) {
  const viewport = page.viewportSize()?.width ?? 0
  return `${base}${viewport < 600 ? 'm' : 'd'}${Date.now().toString(36)}`
}
