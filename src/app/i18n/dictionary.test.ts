import { describe, expect, it } from 'vitest'
import { dictionary } from './dictionary'

describe('dictionary', () => {
  it('keeps English and Russian keys aligned', () => {
    expect(Object.keys(dictionary.ru).sort()).toEqual(
      Object.keys(dictionary.en).sort(),
    )
  })
})
