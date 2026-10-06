import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PersonRef, TreeGraph } from '../api/types'
import { axeViolations } from '../test/axe'
import { mockApi, renderApp } from '../test/render'
import { fitChart, MARGIN_MM, papers, TITLE_MM } from './paper'

describe('fitting a chart to paper', () => {
  it('picks the orientation that prints larger and centres the chart', () => {
    const wide = fitChart(4000, 1000, papers.A3, 'auto', true)
    expect(wide.landscape).toBe(true)
    expect([wide.paperW, wide.paperH]).toEqual([420, 297])
    expect(wide.scale).toBeCloseTo((420 - 2 * MARGIN_MM) / 4000)
    expect(wide.x).toBeCloseTo(MARGIN_MM)
    expect(wide.y).toBeGreaterThan(MARGIN_MM + TITLE_MM)

    const forced = fitChart(4000, 1000, papers.A3, 'portrait', false)
    expect(forced.landscape).toBe(false)
    expect(forced.namePt).toBeLessThan(wide.namePt)
  })

  it('does not blow a small tree up', () => {
    const small = fitChart(200, 100, papers.A0, 'auto', false)
    expect(small.namePt).toBeLessThan(20)
  })
})

const person = (id: number, givenNames: string, extra: Partial<PersonRef> = {}): PersonRef => ({
  id,
  givenNames,
  surname: 'Weber',
  sex: 'U',
  birthDate: '',
  deathDate: '',
  living: false,
  portrait: null,
  ...extra,
})

const graph: TreeGraph = {
  rootId: 1,
  persons: { 1: person(1, 'Paul', { sex: 'M', birthDate: '1890' }), 2: person(2, 'Hans', { sex: 'M' }), 3: person(3, 'Maria', { sex: 'F' }) },
  families: [{ id: 10, partner1Id: 2, partner2Id: 3, unionType: 'married', children: [{ personId: 1, relationPartner1: 'birth', relationPartner2: 'birth' }] }],
  truncated: false,
}

describe('chart page', () => {
  it('draws the chart on the chosen paper', async () => {
    mockApi({
      'GET /api/tree/1': [200, graph],
      'GET /api/persons/1': [200, { ...graph.persons[1], events: [], parentFamilies: [], partnerFamilies: [] }],
    })
    const { container } = renderApp('/chart?root=1')
    const chart = await screen.findByRole('img', { name: 'Ancestors of Paul Weber: chart of 3 people' })
    expect(chart).toHaveTextContent('♂ Paul Weber')
    expect(chart).toHaveTextContent('* 1890')
    expect(screen.getByText(/3 people on A3/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Paper'), { target: { value: 'A4' } })
    fireEvent.change(screen.getByLabelText('Orientation'), { target: { value: 'landscape' } })
    expect(chart.getAttribute('width')).toBe('297mm')
    expect(container.querySelector('style')?.textContent).toContain('size: 297mm 210mm')
    expect(await axeViolations(container)).toEqual([])
  })
})
