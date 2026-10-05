import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { App } from '../App'

export function renderApp(path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

export function stubFetch(status: number, body: unknown) {
  return () =>
    Promise.resolve(
      new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
    )
}
