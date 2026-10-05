export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api${path}`, { signal, headers: { Accept: 'application/json' } })
  if (!res.ok) {
    let message = res.statusText
    try {
      const body = (await res.json()) as { error?: string }
      message = body.error ?? message
    } catch {
      // Non-JSON error bodies (e.g. a proxy page) keep the status text.
    }
    throw new ApiError(res.status, message)
  }
  return (await res.json()) as T
}

export interface Health {
  status: 'ok' | 'degraded'
  version: string
  database: 'ok' | 'unreachable'
}

export const getHealth = (signal?: AbortSignal) => getJSON<Health>('/health', signal)
