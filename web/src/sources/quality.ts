export type Quality = 0 | 1 | 2 | 3

/** The translation key for a GEDCOM citation quality (QUAY). */
export const qualityKey = (q: number) => `citation.qualities.${q as Quality}` as const
