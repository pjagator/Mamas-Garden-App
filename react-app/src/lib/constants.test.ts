import { describe, it, expect } from 'vitest'
import { findExistingMatches } from './constants'

type TestItem = { common?: string | null; scientific?: string | null }

const garden: TestItem[] = [
  { common: 'Firebush', scientific: 'Hamelia patens' },
  { common: 'Coontie', scientific: 'Zamia integrifolia' },
]

describe('findExistingMatches', () => {
  it('matches on exact scientific name', () => {
    const result = findExistingMatches({ common: 'Scarlet bush', scientific: 'Hamelia patens' }, garden)
    expect(result).toHaveLength(1)
    expect(result[0].common).toBe('Firebush')
  })

  it('matches on common name when scientific differs', () => {
    const result = findExistingMatches({ common: 'Firebush', scientific: '' }, garden)
    expect(result).toHaveLength(1)
    expect(result[0].scientific).toBe('Hamelia patens')
  })

  it('normalizes case and whitespace', () => {
    const result = findExistingMatches({ common: '  fire  bush ', scientific: 'HAMELIA   PATENS' }, garden)
    expect(result).toHaveLength(1)
  })

  it('returns empty when nothing matches', () => {
    expect(findExistingMatches({ common: 'Beautyberry', scientific: 'Callicarpa americana' }, garden)).toHaveLength(0)
  })

  it('never matches on empty/blank names', () => {
    const withBlank: TestItem[] = [{ common: '', scientific: '' }]
    expect(findExistingMatches({ common: '', scientific: '' }, withBlank)).toHaveLength(0)
    expect(findExistingMatches({ common: '   ', scientific: null }, garden)).toHaveLength(0)
  })

  it('returns all matches when several exist', () => {
    const dupes: TestItem[] = [
      { common: 'Firebush', scientific: 'Hamelia patens' },
      { common: 'Firebush', scientific: 'Hamelia patens' },
    ]
    expect(findExistingMatches({ common: 'Firebush', scientific: 'Hamelia patens' }, dupes)).toHaveLength(2)
  })
})
