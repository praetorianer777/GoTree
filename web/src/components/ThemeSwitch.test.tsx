import { fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { mockApi, renderApp } from '../test/render'

describe('theme switch', () => {
  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('switches to dark and back to the system theme', async () => {
    mockApi({})
    renderApp('/')
    const select = await screen.findByLabelText('Theme')
    expect(select).toHaveValue('system')

    fireEvent.change(select, { target: { value: 'dark' } })
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('gotree-theme')).toBe('dark')

    fireEvent.change(select, { target: { value: 'system' } })
    expect(document.documentElement).not.toHaveClass('dark')
    expect(localStorage.getItem('gotree-theme')).toBeNull()
  })
})
