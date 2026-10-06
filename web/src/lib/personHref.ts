import { createContext, useContext } from 'react'

/**
 * Where a link to a person goes. The app links to /people/:id; the
 * read-only share view provides its own addresses.
 */
export const PersonHrefContext = createContext((id: number) => `/people/${id}`)

export const usePersonHref = () => useContext(PersonHrefContext)
