export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string>

  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const res = await fetch(`/api${path}`, {
    method,
    signal,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) {
    let message = res.statusText
    let fields: Record<string, string> = {}
    try {
      const err = (await res.json()) as { error?: string; fields?: Record<string, string> }
      message = err.error ?? message
      fields = err.fields ?? {}
    } catch {
      // Non-JSON error bodies (e.g. a proxy page) keep the status text.
    }
    throw new ApiError(res.status, message, fields)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const getJSON = <T>(path: string, signal?: AbortSignal) => request<T>('GET', path, undefined, signal)
export const postJSON = <T>(path: string, body?: unknown) => request<T>('POST', path, body)
export const putJSON = <T>(path: string, body: unknown) => request<T>('PUT', path, body)
export const del = (path: string) => request<void>('DELETE', path)

export interface Health {
  status: 'ok' | 'degraded'
  version: string
  database: 'ok' | 'unreachable'
}

export const getHealth = (signal?: AbortSignal) => getJSON<Health>('/health', signal)

export interface User {
  id: number
  username: string
  displayName: string
  role: 'admin' | 'user'
}

export interface AuthState {
  setupRequired: boolean
  user: User | null
  tree: { id: number; name: string; role: 'owner' | 'editor' | 'viewer' } | null
}

export const getAuthState = (signal?: AbortSignal) => getJSON<AuthState>('/auth/state', signal)

export interface SetupInput {
  username: string
  password: string
  treeName: string
}

export const setup = (input: SetupInput) => postJSON<AuthState>('/auth/setup', input)
export const login = (username: string, password: string) => postJSON<void>('/auth/login', { username, password })
export const logout = () => postJSON<void>('/auth/logout')
