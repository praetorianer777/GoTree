/**
 * Looks for the printed chart. Every theme keeps dark ink on a light
 * paper so a black-and-white print stays legible; the sex colours are
 * only an accent next to the ♂/♀ mark.
 */
export interface ChartTheme {
  paper: string
  ink: string
  muted: string
  line: string
  card: string
  cardStroke: string
  root: string
  rootFill: string
  avatar: string
  avatarInk: string
  sex: Record<string, string>
  font: string
  titleFont: string
  /** A filled band behind the title, drawn in the line colour. */
  band: boolean
  /** A double frame around the page. */
  frame: boolean
  /** Branches with leaves instead of lines, rounded cards and hearts for couples. */
  leafy: boolean
}

const sans = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const serif = "Georgia, 'Palatino Linotype', 'Book Antiqua', Palatino, serif"

export type ChartThemeName = 'tree' | 'classic' | 'heritage' | 'modern'

export const chartThemes: Record<ChartThemeName, ChartTheme> = {
  tree: {
    paper: '#f7f3e6',
    ink: '#2f2416',
    muted: '#5a4a35',
    line: '#7a5534',
    card: '#fffdf5',
    cardStroke: '#4d8a3e',
    root: '#9a5b13',
    rootFill: '#fdf3dc',
    avatar: '#e3edd5',
    avatarInk: '#2f4a26',
    sex: { F: '#a8485e', M: '#3d6b8c', X: '#6d5a8a' },
    font: serif,
    titleFont: serif,
    band: false,
    frame: true,
    leafy: true,
  },
  classic: {
    paper: '#ffffff',
    ink: '#0f172a',
    muted: '#475569',
    line: '#64748b',
    card: '#ffffff',
    cardStroke: '#cbd5e1',
    root: '#0f5c7a',
    rootFill: '#eef8fb',
    avatar: '#e2e8f0',
    avatarInk: '#334155',
    sex: { F: '#e11d48', M: '#0284c7', X: '#7c3aed' },
    font: sans,
    titleFont: sans,
    band: false,
    frame: false,
    leafy: false,
  },
  heritage: {
    paper: '#fbf6ea',
    ink: '#3b2a1a',
    muted: '#5e4a36',
    line: '#8a7050',
    card: '#fffdf7',
    cardStroke: '#cdb68f',
    root: '#7a4e1d',
    rootFill: '#f5e9d3',
    avatar: '#e6d2ab',
    avatarInk: '#5e4a36',
    sex: { F: '#a8485e', M: '#3d6b8c', X: '#6d5a8a' },
    font: serif,
    titleFont: serif,
    band: false,
    frame: true,
    leafy: false,
  },
  modern: {
    paper: '#ffffff',
    ink: '#0f172a',
    muted: '#475569',
    line: '#0f5c7a',
    card: '#f8fafc',
    cardStroke: '#d5eef5',
    root: '#0f5c7a',
    rootFill: '#eef8fb',
    avatar: '#d5eef5',
    avatarInk: '#0c4a62',
    sex: { F: '#e11d48', M: '#0284c7', X: '#7c3aed' },
    font: sans,
    titleFont: sans,
    band: true,
    frame: false,
    leafy: false,
  },
}
