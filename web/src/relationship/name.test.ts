import { describe, expect, it } from 'vitest'
import type { PersonRef, RelationshipReport, Sex } from '../api/types'
import i18n from '../i18n'
import { kinshipName, relationshipName } from './name'

const t = i18n.t.bind(i18n)

const k = (up: number, down: number, extra: { half?: boolean; adoptive?: boolean } = {}) => ({
  up,
  down,
  half: false,
  adoptive: false,
  ...extra,
})

describe('kinship names', () => {
  it.each<[number, number, Sex, string]>([
    [1, 0, 'M', 'father'],
    [2, 0, 'F', 'grandmother'],
    [3, 0, 'U', 'great-grandparent'],
    [4, 0, 'M', 'great-great-grandfather'],
    [5, 0, 'M', '3× great-grandfather'],
    [0, 1, 'F', 'daughter'],
    [0, 3, 'M', 'great-grandson'],
    [1, 1, 'X', 'sibling'],
    [2, 1, 'F', 'aunt'],
    [2, 1, 'U', 'aunt or uncle'],
    [3, 1, 'M', 'great-uncle'],
    [1, 2, 'F', 'niece'],
    [1, 3, 'M', 'grandnephew'],
    [1, 4, 'U', 'great-grandniece or great-grandnephew'],
    [2, 2, 'M', 'first cousin'],
    [3, 3, 'F', 'second cousin'],
    [2, 3, 'U', 'first cousin once removed'],
    [3, 2, 'U', 'first cousin once removed'],
    [2, 5, 'U', 'first cousin 3 times removed'],
    [11, 11, 'U', '10th cousin'],
  ])('%i up, %i down, sex %s → %s', (up, down, sex, want) => {
    expect(kinshipName(t, k(up, down), sex)).toBe(want)
  })

  it('marks half and adoptive relations', () => {
    expect(kinshipName(t, k(1, 1, { half: true }), 'F')).toBe('half-sister')
    expect(kinshipName(t, k(1, 0, { adoptive: true }), 'M')).toBe('father (not by birth)')
  })
})

const person = (id: number, sex: Sex): PersonRef => ({
  id,
  givenNames: `P${id}`,
  surname: '',
  sex,
  birthDate: '',
  deathDate: '',
  living: false,
  portrait: null,
})

function report(kind: RelationshipReport['kind'], up: number, down: number, bSex: Sex, viaSex: Sex = 'U'): RelationshipReport {
  return {
    a: 1,
    b: 2,
    kind,
    kinship: { ...k(up, down), ancestors: [], path: [] },
    via: 3,
    others: [],
    persons: { 1: person(1, 'U'), 2: person(2, bSex), 3: person(3, viaSex) },
  }
}

describe('relationship names', () => {
  it.each<[RelationshipReport, string | null]>([
    [{ ...report('spouse', 0, 0, 'F'), kinship: undefined }, 'wife'],
    [report('spouse_of_relative', 1, 0, 'M'), 'stepfather'],
    [report('spouse_of_relative', 0, 1, 'F'), 'daughter-in-law'],
    [report('spouse_of_relative', 1, 1, 'M'), 'brother-in-law'],
    [report('spouse_of_relative', 2, 1, 'F', 'M'), 'uncle’s wife'],
    [report('relative_of_spouse', 1, 0, 'F'), 'mother-in-law'],
    [report('relative_of_spouse', 0, 1, 'U'), 'stepchild'],
    [report('relative_of_spouse', 2, 2, 'M', 'F'), 'wife’s first cousin'],
    [{ ...report('none', 0, 0, 'U'), kinship: undefined }, null],
  ])('%#: %s', (rep, want) => {
    expect(relationshipName(t, rep)).toBe(want)
  })
})
