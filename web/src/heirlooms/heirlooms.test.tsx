import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Heirloom } from '../api/types'
import { axeViolations } from '../test/axe'
import { mockApi, renderApp } from '../test/render'

const watch: Heirloom = {
  id: 4,
  name: 'Pocket watch',
  kind: 'jewellery',
  description: 'Silver, engraved J.W.',
  madeDate: 'ABT 1880',
  originPlace: { id: 1, fullName: 'Leipzig, Sachsen' },
  currentLocation: 'Paul’s desk',
  notes: '',
  custody: [
    {
      id: 1,
      person: { id: 2, givenNames: 'Anna', surname: 'Weber', sex: 'F', birthDate: '1890', deathDate: '1965', living: false, portrait: null },
      fromDate: '1920',
      toDate: '1965',
      how: 'inherited',
      notes: '',
    },
    { id: 2, person: null, fromDate: '1965', toDate: '', how: 'purchased', notes: 'a dealer in Halle' },
  ],
  citations: [],
  createdAt: '',
  updatedAt: '',
}

describe('heirloom page', () => {
  it('shows the custody timeline and edits the holders', async () => {
    let sent: unknown
    mockApi({
      'GET /api/heirlooms/4': [200, watch],
      'GET /api/media': [200, []],
      'PUT /api/heirlooms/4': (body) => {
        sent = body
        return [200, watch]
      },
    })
    const { container } = renderApp('/heirlooms/4')

    expect(await screen.findByRole('heading', { level: 1, name: 'Pocket watch' })).toBeInTheDocument()
    const timeline = screen.getByRole('region', { name: 'Who held it' })
    const holders = within(timeline).getAllByRole('listitem')
    expect(holders[0]).toHaveTextContent('Anna Weber1890 – 19651920 – 1965 · inherited')
    expect(holders[1]).toHaveTextContent('Someone not in the treesince 1965 · boughta dealer in Halle')
    expect(screen.getByText('Leipzig, Sachsen')).toBeInTheDocument()
    expect(await axeViolations(container)).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit heirloom' })
    fireEvent.click(within(dialog).getByRole('button', { name: /Move holder 2 up/ }))
    fireEvent.click(within(dialog).getByRole('button', { name: /^Save/ }))
    await waitFor(() =>
      expect(sent).toMatchObject({
        name: 'Pocket watch',
        custody: [
          { personId: null, fromDate: '1965', how: 'purchased', notes: 'a dealer in Halle' },
          { personId: 2, fromDate: '1920', toDate: '1965', how: 'inherited' },
        ],
      }),
    )
  })
})
