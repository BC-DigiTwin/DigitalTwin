import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setPointerCursor } from './pointerCursor'

describe('setPointerCursor', () => {
  let originalCursor: string

  beforeEach(() => {
    originalCursor = document.body.style.cursor
  })

  afterEach(() => {
    document.body.style.cursor = originalCursor
  })

  it('sets cursor to "pointer" when isOver is true', () => {
    setPointerCursor(true)
    expect(document.body.style.cursor).toBe('pointer')
  })

  it('sets cursor to "auto" when isOver is false', () => {
    setPointerCursor(false)
    expect(document.body.style.cursor).toBe('auto')
  })
})
