import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'
import { ApiError } from './api/client'
import { App } from './App'
import './i18n'
import './index.css'

const queryClient: QueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 1,
    },
  },
  // An expired session surfaces as a 401 from any query; re-checking the
  // auth state brings up the login screen.
  queryCache: new QueryCache({
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) void queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  }),
})

// A new version waits until the user chooses to reload; see UpdateNotice.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh: () => window.dispatchEvent(new CustomEvent('gotree:update-ready')),
})
window.addEventListener('gotree:apply-update', () => void updateSW(true))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
