import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fullName, lifespan } from '../lib/people'
import type { LayoutNode, TreeLayout } from '../tree/layout'
import type { TreeIndex } from '../tree/model'
import { bounds, photoUrl } from './geometry'
import type { Fit } from './paper'

interface Props {
  layout: TreeLayout
  index: TreeIndex
  fit: Fit
  title: string
  photos: boolean
  /** Replaces photo URLs, e.g. with data URIs for a standalone file. */
  photoSrc?: Record<string, string>
}



/** Shortens text to roughly fit a width, since SVG text does not wrap. */
function fitText(text: string, width: number, size: number) {
  const max = Math.floor(width / (size * 0.56))
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text
}

const sexColor: Record<string, string> = { F: '#e11d48', M: '#0284c7' }

/**
 * The chart as SVG in millimetres on the given paper. Always light, since
 * it is meant for paper; colours are not the only cue (♂/♀ marks sex).
 */
export const WallChart = forwardRef<SVGSVGElement, Props>(function WallChart(
  { layout, index, fit, title, photos, photoSrc },
  ref,
) {
  const { t } = useTranslation()
  const b = bounds(layout)
  const byId = new Map(layout.nodes.map((n) => [n.id, n]))
  const center = (n: LayoutNode) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 })
  const people = layout.nodes.filter((n) => n.kind === 'person').length

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={`${fit.paperW}mm`}
      height={`${fit.paperH}mm`}
      viewBox={`0 0 ${fit.paperW} ${fit.paperH}`}
      role="img"
      aria-label={t('chart.imageLabel', { title, count: people })}
      fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
      className="h-auto w-full bg-white"
    >
      <title>{title}</title>
      <rect width={fit.paperW} height={fit.paperH} fill="#ffffff" />
      {title && (
        <text x={fit.paperW / 2} y={10 + 9} textAnchor="middle" fontSize={9} fontWeight={600} fill="#0f172a">
          {title}
        </text>
      )}
      <g transform={`translate(${fit.x} ${fit.y}) scale(${fit.scale}) translate(${-b.minX} ${-b.minY})`}>
        <g fill="none" stroke="#64748b" strokeWidth={2}>
          {layout.edges.map((e) => {
            const s = byId.get(e.source)
            const d = byId.get(e.target)
            if (!s || !d) return null
            const [top, bottom] = center(s).y <= center(d).y ? [s, d] : [d, s]
            const x1 = center(top).x
            const y1 = top.y + top.h
            const x2 = center(bottom).x
            const y2 = bottom.y
            const mid = (y1 + y2) / 2
            return <path key={e.id} d={`M ${x1} ${y1} V ${mid} H ${x2} V ${y2}`} />
          })}
        </g>
        {layout.nodes.map((n) => {
          if (n.kind === 'junction') {
            const c = center(n)
            return <circle key={n.id} cx={c.x} cy={c.y} r={n.w / 2} fill="#64748b" />
          }
          if (n.kind === 'unknown') {
            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={n.w}
                  height={n.h}
                  rx={10}
                  fill="#ffffff"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                <text
                  x={n.x + n.w / 2}
                  y={n.y + n.h / 2 + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontStyle="italic"
                  fill="#475569"
                >
                  {t('person.unknownParent')}
                </text>
              </g>
            )
          }
          const p = n.personId !== undefined ? index.persons.get(n.personId) : undefined
          if (!p) return null
          const name = fullName(p) ?? t('person.unknown')
          if (n.kind === 'repeat') {
            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={n.w}
                  height={n.h}
                  rx={10}
                  fill="#ffffff"
                  stroke="#1d7fa3"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                <text x={n.x + 8} y={n.y + n.h / 2 + 4} fontSize={11} fill="#334155">
                  {fitText(`↺ ${t('tree.repeat', { name })}`, n.w - 16, 11)}
                </text>
              </g>
            )
          }
          const src = photos ? photoUrl(p) : null
          const shown = src ? (photoSrc?.[src] ?? src) : null
          const textX = n.x + 16 + 40 + 8
          const clip = `wc-clip-${n.id}`
          const mark = p.sex === 'M' ? '♂ ' : p.sex === 'F' ? '♀ ' : ''
          return (
            <g key={n.id}>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={10}
                fill="#ffffff"
                stroke={n.root ? '#0f5c7a' : '#cbd5e1'}
                strokeWidth={2}
              />
              {sexColor[p.sex] && <rect x={n.x} y={n.y} width={6} height={n.h} rx={3} fill={sexColor[p.sex]} />}
              <clipPath id={clip}>
                <circle cx={n.x + 16 + 20} cy={n.y + n.h / 2} r={20} />
              </clipPath>
              {shown ? (
                <image
                  href={shown}
                  x={n.x + 16}
                  y={n.y + n.h / 2 - 20}
                  width={40}
                  height={40}
                  clipPath={`url(#${clip})`}
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <>
                  <circle cx={n.x + 16 + 20} cy={n.y + n.h / 2} r={20} fill="#e2e8f0" />
                  <text
                    x={n.x + 16 + 20}
                    y={n.y + n.h / 2 + 5}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={600}
                    fill="#334155"
                  >
                    {[p.givenNames, p.surname].map((x) => x.trim()[0] ?? '').join('') || '?'}
                  </text>
                </>
              )}
              <text x={textX} y={n.y + n.h / 2 + (lifespan(p) ? -4 : 5)} fontSize={13} fontWeight={600} fill="#0f172a">
                {fitText(mark + name, n.x + n.w - 6 - textX, 13)}
              </text>
              <text x={textX} y={n.y + n.h / 2 + 14} fontSize={11} fill="#475569">
                {fitText(lifespan(p), n.x + n.w - 6 - textX, 11)}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
})
