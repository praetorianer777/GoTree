import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { axeViolations } from './test/axe'
import { mockApi, renderApp } from './test/render'

describe('app shell', () => {
  it('shows the server version once the health check answers', async () => {
    mockApi({})
    renderApp()
    expect(await screen.findByText('Server online · version 1.2.3')).toBeInTheDocument()
    expect(screen.getByText('Server online · version 1.2.3')).toHaveAttribute('role', 'status')
  })

  it('reports an unreachable server', async () => {
    mockApi({ 'GET /api/health': [503, { error: 'down' }] })
    renderApp()
    expect(await screen.findByText('The server cannot be reached.')).toBeInTheDocument()
  })

  it('has landmarks, a skip link and one main heading', async () => {
    mockApi({})
    renderApp()
    await screen.findByRole('navigation', { name: 'Main navigation' })
    expect(screen.getByRole('link', { name: 'Skip to main content' })).toHaveAttribute('href', '#main')
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it('marks the current page and moves focus to its heading on navigation', async () => {
    mockApi({})
    const user = userEvent.setup()
    renderApp()
    const nav = await screen.findByRole('navigation', { name: 'Main navigation' })

    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page')
    await user.click(screen.getByRole('link', { name: 'People' }))

    const heading = await screen.findByRole('heading', { level: 1, name: 'People' })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(nav.querySelector('[aria-current="page"]')).toHaveTextContent('People')
    expect(document.title).toBe('People · GoTree')
  })

  it('shows a not-found page for unknown routes', async () => {
    mockApi({})
    renderApp('/does/not/exist')
    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to the start page' })).toHaveAttribute('href', '/')
  })

  it.each(['/', '/people', '/tree', '/import-export', '/nope'])('has no axe violations on %s', async (path) => {
    mockApi({})
    const { container } = renderApp(path)
    await screen.findByRole('navigation', { name: 'Main navigation' })
    if (path === '/') await screen.findByText(/Server online/)
    expect(await axeViolations(container)).toEqual([])
  })
})
