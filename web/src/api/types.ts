export type Sex = 'M' | 'F' | 'U' | 'X'
export type FactStatus = 'accepted' | 'disputed' | 'disproven'
export type UnionType = 'married' | 'partners' | 'unknown'
export type ChildRelation = 'birth' | 'adopted' | 'foster' | 'step' | 'surrogate' | 'sealing' | 'unknown'
export type NameType = 'birth' | 'married' | 'aka' | 'religious' | 'immigrant' | 'other'
export type Relation = 'parent' | 'partner' | 'child' | 'sibling'

export interface PersonRef {
  id: number
  givenNames: string
  surname: string
  sex: Sex
  birthDate: string
  deathDate: string
  living: boolean
}

export interface AlternateName {
  id: number
  type: NameType
  givenNames: string
  surname: string
  namePrefix: string
  nameSuffix: string
  nickname: string
  status: FactStatus
  statusReason: string
  sortOrder: number
}

export interface Person {
  id: number
  givenNames: string
  surname: string
  namePrefix: string
  nameSuffix: string
  nickname: string
  sex: Sex
  isLiving: boolean | null
  living: boolean
  notes: string
  alternateNames: AlternateName[]
  createdAt: string
  updatedAt: string
}

export interface DateValue {
  raw: string
  normalized: string
  qualifier: string
  valid: boolean
  sortKey: number | null
}

export interface PlaceRef {
  id: number
  fullName: string
}

export interface Participant {
  person: PersonRef
  role: string
  customRole: string
  notes: string
}

export interface LifeEvent {
  id: number
  personId: number | null
  familyId: number | null
  type: string
  customLabel: string
  date: DateValue
  place: PlaceRef | null
  description: string
  notes: string
  status: FactStatus
  statusReason: string
  sortOrder: number
  participants: Participant[]
  role?: string
  createdAt: string
  updatedAt: string
}

export interface ChildLink {
  person: PersonRef
  relationPartner1: ChildRelation
  relationPartner2: ChildRelation
  sortOrder: number
}

export interface Family {
  id: number
  partner1: PersonRef | null
  partner2: PersonRef | null
  unionType: UnionType
  notes: string
  children: ChildLink[]
  events: LifeEvent[]
  createdAt: string
  updatedAt: string
}

export interface PersonDetail extends Person {
  events: LifeEvent[]
  parentFamilies: Family[]
  partnerFamilies: Family[]
}

export interface PersonList {
  items: PersonRef[]
  total: number
}

export interface Place {
  id: number
  parentId: number | null
  name: string
  placeType: string
  lat: number | null
  lng: number | null
  notes: string
  fullName: string
}

export interface AlternateNameInput {
  type: NameType
  givenNames: string
  surname: string
  namePrefix: string
  nameSuffix: string
  nickname: string
  status: FactStatus
  statusReason: string
}

export interface PersonInput {
  givenNames: string
  surname: string
  namePrefix: string
  nameSuffix: string
  nickname: string
  sex: Sex
  isLiving: boolean | null
  notes: string
  alternateNames: AlternateNameInput[]
}

export interface ParticipantInput {
  personId: number
  role: string
  customRole: string
  notes: string
}

export interface EventInput {
  personId: number | null
  familyId: number | null
  type: string
  customLabel: string
  date: string
  placeId: number | null
  description: string
  notes: string
  status: FactStatus
  statusReason: string
  sortOrder: number
  participants: ParticipantInput[]
}

export interface FamilyInput {
  partner1Id: number | null
  partner2Id: number | null
  unionType: UnionType
  notes: string
}

export interface RelativeInput {
  relation: Relation
  personId?: number
  person?: PersonInput
  familyId?: number
  unionType?: UnionType
  childRelation?: ChildRelation
}

export interface RelativeResult {
  person: Person
  family: Family
}

export interface PlaceInput {
  parentId: number | null
  name: string
  placeType: string
  lat: number | null
  lng: number | null
  notes: string
}

export interface ParsedDate {
  valid: boolean
  empty: boolean
  normalized: string
  qualifier: string
  error?: string
}

export interface TreeChild {
  personId: number
  relationPartner1: ChildRelation
  relationPartner2: ChildRelation
}

export interface TreeFamily {
  id: number
  partner1Id: number | null
  partner2Id: number | null
  unionType: UnionType
  children: TreeChild[]
}

export interface TreeGraph {
  rootId: number
  persons: Record<string, PersonRef>
  families: TreeFamily[]
  truncated: boolean
}
