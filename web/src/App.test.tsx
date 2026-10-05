import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { axeViolations } from './test/axe'
import { renderApp, stubFetch } from './test/render'

const healthy = { status: 'ok', version: '1.2.3', database: 'ok' }

describe('app shell', () => {
  it('shows the server version once the health check answers', async () => {
    vi.stubGlobal('fetch', vi.fn(stubFetch(200, healthy)))
    renderApp()
    expect(await screen.findByText('Server online · version 1.2.3')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('version 1.2.3')
  })

  it('reports an unreachable server', async () => {
    vi.stubGlobal('fetch', vi.fn(stubFetch(503, { error: 'down' })))
    renderApp()
    expect(await screen.findByText('The server cannot be reached.')).toBeInTheDocument()
  })

  it('has landmarks, a skip link and one main heading', () => {
    vi.stubGlobal('fetch', vi.fn(stubFetch(200, healthy)))
    renderApp()
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('marks the current page and moves focus to its heading on navigation', async () => {
    vi.stubGlobal('fetch', vi.fn(stubFetch(200, healthy)))
    const user = userEvent.setup()
    renderApp()
    const nav = screen.getByRole('navigation', { name: 'Main navigation' })

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('link', { name: 'People' }))

    const heading = await screen.findByRole('heading', { level: 1, name: 'People' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('People')
    expect(document.title).toBe('People · GoTree')
  })

  it('shows a not-found page for unknown routes', () => {
    vi.stubGlobal('fetch', vi.fn(stubFetch(200, healthy)))
    renderApp('/does/not/exist')
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the start page' })).toHaveAttribute('href', '/')
  })

  it.each(['/', '/people', '/tree', '/import-export', '/nope'])('has no axe violations on %s', async (path) => {
    vi.stubGlobal('fetch', vi.fn(stubFetch(200, healthy)))
    const { container } = renderApp(path)
    if (path === '/') await screen.findByText(/Server online/)
    expect(await axeViolations(container)).toEqual([])
  })
})
