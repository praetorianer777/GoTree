import axe from 'axe-core'

/** Runs axe against a rendered container and returns readable violations. */
export async function axeViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container, {
    // jsdom does no layout, so contrast cannot be computed here; it is
    // checked in the browser instead.
    rules: { 'color-contrast': { enabled: false } },
  })
  return results.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(' ')).join(', ')})`,
  )
}
