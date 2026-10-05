import { ApiError } from '../api/client'

/** Field errors from a 422, and a form-level message for anything else. */
export function formErrors(error: unknown, fallback: (message: string) => string) {
  if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
    return { fields: error.fields, form: null }
  }
  if (error instanceof Error) return { fields: {} as Record<string, string>, form: fallback(error.message) }
  return { fields: {} as Record<string, string>, form: null }
}
