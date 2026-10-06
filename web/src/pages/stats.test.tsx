import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Stats } from '../api/types'
import { axeViolations } from '../test/axe'
import { mockApi, renderApp } from '../test/render'

const stats: Stats = {
  persons: 6,
  families: 2,
  withLifespan: 2,
  lifespans: [{ decade: 1850, count: 2, average: 74.5, min: 69, max: 80 }],
  marriages: [{ decade: 1850, firstMen: { count: 1, average: 26 }, firstWomen: { count: 2, average: 24.5 }, later: { count: 0, average: 0 } }],
  childrenHistogram: [1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  childrenAverage: 1.5,
  surnames: [{ name: 'Weber', count: 5 }, { name: 'Schulz', count: 1 }],
  givenNames: [{ name: 'Anna', count: 2 }],
  givenNameTrends: [{ decade: 1850, men: [{ name: 'Johann', count: 1 }], women: [] }],
}

describe('statistics page', () => {
  it('shows every figure as a table', async () => {
    mockApi({ 'GET /api/stats': [200, stats] })
    const { container } = renderApp('/stats')
    const lifespan = await screen.findByRole('region', { name: 'Lifespan by decade of birth' })
    expect(within(lifespan).getByRole('row', { name: /1850s 74.5 69–80 2/ })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Age at marriage' })).getByText('24.5 (2)')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Children per family' })).getByText('10 or more')).toBeInTheDocument()
    expect(screen.getByText('Weber, 5 people')).toBeInTheDocument()
    expect(await axeViolations(container)).toEqual([])
  })
})
