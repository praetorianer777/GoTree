import { describe, expect, it } from 'vitest'
import { fullName, lifespan, yearOf } from './people'

describe('people helpers', () => {
  it.each([
    ['', ''],
    ['1850', '1850'],
    ['12 MAR 1850', '1850'],
    ['ABT 1850', '~1850'],
    ['EST 1850', '~1850'],
    ['BEF 1901', '<1901'],
    ['AFT 1901', '>1901'],
    ['BET 1850 AND 1860', '~1850'],
    ['FROM 1914 TO 1918', '~1914'],
    ['11 FEB 1731/32', '1731'],
    ['sometime in spring', 'sometime in spring'],
  ])('yearOf(%j) = %j', (date, want) => {
    expect(yearOf(date)).toBe(want)
  })

  it('formats lifespans', () => {
    expect(lifespan({ birthDate: '1850', deathDate: '3 JUN 1912' })).toBe('1850 – 1912')
    expect(lifespan({ birthDate: 'ABT 1850', deathDate: '' })).toBe('* ~1850')
    expect(lifespan({ birthDate: '', deathDate: '1912' })).toBe('† 1912')
    expect(lifespan({ birthDate: '', deathDate: '' })).toBe('')
  })

  it('returns null for unnamed people', () => {
    expect(fullName({ givenNames: '', surname: '' })).toBeNull()
    expect(fullName({ givenNames: 'Anna', surname: '' })).toBe('Anna')
    expect(fullName({ givenNames: 'Anna', surname: 'Müller' })).toBe('Anna Müller')
  })
})
