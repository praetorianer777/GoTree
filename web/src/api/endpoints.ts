import { del, getJSON, postJSON, putJSON } from './client'
import type {
  EventInput,
  Family,
  FamilyInput,
  LifeEvent,
  ParsedDate,
  Person,
  PersonDetail,
  PersonInput,
  PersonList,
  Place,
  PlaceInput,
  RelativeInput,
  RelativeResult,
  Repository,
  Source,
  SourceDetail,
  SourceInput,
  TreeGraph,
} from './types'

const qs = (params: Record<string, string | number>) =>
  new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()

export const listPersons = (q: string, limit: number, offset: number, signal?: AbortSignal) =>
  getJSON<PersonList>(`/persons?${qs({ q, limit, offset })}`, signal)
export const getPerson = (id: number, signal?: AbortSignal) => getJSON<PersonDetail>(`/persons/${id}`, signal)
export const createPerson = (input: PersonInput) => postJSON<Person>('/persons', input)
export const updatePerson = (id: number, input: PersonInput) => putJSON<Person>(`/persons/${id}`, input)
export const deletePerson = (id: number) => del(`/persons/${id}`)
export const addRelative = (id: number, input: RelativeInput) =>
  postJSON<RelativeResult>(`/persons/${id}/relatives`, input)

export const createEvent = (input: EventInput) => postJSON<LifeEvent>('/events', input)
export const updateEvent = (id: number, input: EventInput) => putJSON<LifeEvent>(`/events/${id}`, input)
export const deleteEvent = (id: number) => del(`/events/${id}`)

export const updateFamily = (id: number, input: FamilyInput) => putJSON<Family>(`/families/${id}`, input)
export const deleteFamily = (id: number) => del(`/families/${id}`)
export const removeChild = (familyId: number, childId: number) => del(`/families/${familyId}/children/${childId}`)

export const listPlaces = (q: string, signal?: AbortSignal) => getJSON<Place[]>(`/places?${qs({ q, limit: 20 })}`, signal)
export const createPlace = (input: PlaceInput) => postJSON<Place>('/places', input)

export const parseDate = (q: string, signal?: AbortSignal) => getJSON<ParsedDate>(`/dates/parse?${qs({ q })}`, signal)

export const getTree = (id: number, opts: { up: number; down: number; siblings: boolean }, signal?: AbortSignal) =>
  getJSON<TreeGraph>(`/tree/${id}?${qs({ up: opts.up, down: opts.down, siblings: opts.siblings ? 1 : 0 })}`, signal)

export const listSources = (q: string, signal?: AbortSignal) => getJSON<Source[]>(`/sources?${qs({ q, limit: 100 })}`, signal)
export const getSource = (id: number, signal?: AbortSignal) => getJSON<SourceDetail>(`/sources/${id}`, signal)
export const createSource = (input: SourceInput) => postJSON<Source>('/sources', input)
export const updateSource = (id: number, input: SourceInput) => putJSON<Source>(`/sources/${id}`, input)
export const deleteSource = (id: number) => del(`/sources/${id}`)

export const listRepositories = (q: string, signal?: AbortSignal) =>
  getJSON<Repository[]>(`/repositories?${qs({ q })}`, signal)
export const createRepository = (name: string) =>
  postJSON<Repository>('/repositories', { name, address: '', url: '', notes: '' })
