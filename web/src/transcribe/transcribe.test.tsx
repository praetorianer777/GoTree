import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PersonRef, RecordTemplate, Transcription } from '../api/types'
import { axeViolations } from '../test/axe'
import { mockApi, renderApp } from '../test/render'

const census: RecordTemplate = {
  key: 'census',
  name: 'census',
  builtin: true,
  eventType: 'CENS',
  roles: [
    { key: 'head', label: '', kind: 'principal', participant: '' },
    { key: 'spouse', label: '', kind: 'participant', participant: 'spouse' },
  ],
  columns: ['given', 'surname', 'age'],
}

const johann: PersonRef = {
  id: 5,
  givenNames: 'Johann',
  surname: 'Maier',
  sex: 'M',
  birthDate: '1861',
  deathDate: '',
  living: false,
  portrait: null,
}

const draft = (rows: Transcription['rows']): Transcription => ({
  id: 9,
  templateKey: 'census',
  title: '',
  source: null,
  page: '',
  date: '1900',
  place: null,
  notes: '',
  rows,
  status: 'draft',
  eventId: null,
  appliedAt: null,
  persons: {},
  createdAt: '',
  updatedAt: '1',
})

describe('transcription', () => {
  it('matches a row to an existing person and adds the record', async () => {
    const sent: { match?: unknown; create?: unknown } = {}
    mockApi({
      'GET /api/templates': [200, [census]],
      'POST /api/transcriptions/match': (body) => {
        sent.match = body
        return [200, [[{ person: johann, score: 0.92 }]]]
      },
      'POST /api/transcriptions': (body) => {
        sent.create = body
        return [201, draft((body as Transcription).rows)]
      },
      'POST /api/transcriptions/9/apply': [
        200,
        {
          ...draft([]),
          status: 'applied',
          eventId: 3,
          created: [],
          facts: 1,
          rows: [{ line: '12', role: 'head', values: {}, action: 'person', personId: 5 }],
          persons: { 5: johann },
        },
      ],
    })
    const { container } = renderApp('/transcribe/new?template=census')

    const card = await screen.findByRole('group', { name: 'Person 1' })
    fireEvent.change(within(card).getByLabelText('Line'), { target: { value: '12' } })
    fireEvent.change(within(card).getByLabelText('Role'), { target: { value: 'head' } })
    fireEvent.change(within(card).getByLabelText('Given names'), { target: { value: 'Johann' } })
    fireEvent.change(within(card).getByLabelText('Surname'), { target: { value: 'Meyer' } })
    fireEvent.change(within(card).getByLabelText('Age'), { target: { value: '39' } })
    expect(await axeViolations(container)).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: 'Find matches in the tree' }))
    const match = await within(card).findByRole('radio', { name: /Johann Maier.*92 % match/ })
    expect(match).toBeChecked()
    expect(within(card).getByRole('radio', { name: 'A new person' })).not.toBeChecked()
    expect(sent.match).toMatchObject({
      rows: [{ line: '12', role: 'head', values: { given: 'Johann', surname: 'Meyer', age: '39' } }],
    })
    expect(await axeViolations(container)).toEqual([])

    fireEvent.click(screen.getByRole('button', { name: 'Add to the tree' }))
    expect(
      await screen.findByText('Added to the tree: the event, 1 further fact and 0 new people.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open Johann Maier' })).toHaveAttribute('href', '/people/5')
    await waitFor(() =>
      expect(sent.create).toMatchObject({ templateKey: 'census', rows: [{ action: 'person', personId: 5 }] }),
    )
  })
})
