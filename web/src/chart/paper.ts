/** Paper sizes in millimetres, portrait. */
export const papers = {
  A4: { w: 210, h: 297 },
  A3: { w: 297, h: 420 },
  A2: { w: 420, h: 594 },
  A1: { w: 594, h: 841 },
  A0: { w: 841, h: 1189 },
  Letter: { w: 216, h: 279 },
  Tabloid: { w: 279, h: 432 },
} as const

export type PaperName = keyof typeof papers | 'custom'
export type Orientation = 'auto' | 'portrait' | 'landscape'

export const MARGIN_MM = 10
/** Room for the title above the chart. */
export const TITLE_MM = 24
/** Layout units are CSS pixels: 96 per inch. */
export const MM_PER_PX = 25.4 / 96
/** The card text size in layout units (see the chart's font sizes). */
export const NAME_PX = 13
/** Below this the names get hard to read on paper. */
export const MIN_READABLE_PT = 6

export interface Fit {
  /** Paper size in mm after orientation. */
  paperW: number
  paperH: number
  /** Millimetres per layout unit. */
  scale: number
  /** Offset of the chart's top left corner on the paper, in mm. */
  x: number
  y: number
  /** Size of the names on paper, in points. */
  namePt: number
  landscape: boolean
}

function fitOne(
  chartW: number,
  chartH: number,
  paperW: number,
  paperH: number,
  title: boolean,
): Omit<Fit, 'landscape'> {
  const top = MARGIN_MM + (title ? TITLE_MM : 0)
  const availW = paperW - 2 * MARGIN_MM
  const availH = paperH - top - MARGIN_MM
  // Never print larger than on screen: a small tree on big paper stays
  // at its natural size, centred.
  const scale = Math.min(availW / chartW, availH / chartH, MM_PER_PX * 2)
  const x = MARGIN_MM + (availW - chartW * scale) / 2
  const y = top + (availH - chartH * scale) / 2
  const namePt = (NAME_PX * scale * 72) / 25.4
  return { paperW, paperH, scale, x, y, namePt }
}

/** Fits a chart of the given layout size onto the paper. */
export function fitChart(
  chartW: number,
  chartH: number,
  paper: { w: number; h: number },
  orientation: Orientation,
  title: boolean,
): Fit {
  const short = Math.min(paper.w, paper.h)
  const long = Math.max(paper.w, paper.h)
  const portrait = { ...fitOne(chartW, chartH, short, long, title), landscape: false }
  const landscape = { ...fitOne(chartW, chartH, long, short, title), landscape: true }
  if (orientation === 'portrait') return portrait
  if (orientation === 'landscape') return landscape
  return landscape.scale > portrait.scale ? landscape : portrait
}
