import { forwardRef } from 'react'
import { useTranslation } from 'react-i18next'
import { fullName, lifespan } from '../lib/people'
import type { LayoutNode, TreeLayout } from '../tree/layout'
import type { TreeIndex } from '../tree/model'
import { branchEnds, growBranch, growCanopy, growTrunk, HEART_PATH, LEAF_PATH, lightPalette } from '../tree/branches'
import { BranchArt, CanopyArt, TrunkArt } from '../tree/Nature'
import { bounds, elbow, photoUrl } from './geometry'
import { MARGIN_MM, TITLE_MM, type Fit } from './paper'
import { chartThemes, type ChartThemeName } from './themes'

interface Props {
  layout: TreeLayout
  index: TreeIndex
  fit: Fit
  title: string
  /** A smaller line under the title. */
  subtitle?: string
  theme?: ChartThemeName
  photos: boolean
  /** Replaces photo URLs, e.g. with data URIs for a standalone file. */
  photoSrc?: Record<string, string>
}

/** Shortens text to roughly fit a width, since SVG text does not wrap. */
function fitText(text: string, width: number, size: number) {
  const max = Math.floor(width / (size * 0.56))
  return text.length > max ? `${text.slice(0, Math.max(1, max - 1))}…` : text
}

/**
 * The chart as SVG in millimetres on the given paper. Always light, since
 * it is meant for paper; colours are not the only cue (♂/♀ marks sex, a
 * thicker frame the root person).
 */
export const WallChart = forwardRef<SVGSVGElement, Props>(function WallChart(
  { layout, index, fit, title, subtitle, theme = 'classic', photos, photoSrc },
  ref,
) {
  const { t } = useTranslation()
  const b = bounds(layout)
  const byId = new Map(layout.nodes.map((n) => [n.id, n]))
  const center = (n: LayoutNode) => ({ x: n.x + n.w / 2, y: n.y + n.h / 2 })
  const people = layout.nodes.filter((n) => n.kind === 'person').length
  const th = chartThemes[theme]
  const cx = fit.paperW / 2
  const rootNode = layout.nodes.find((n) => n.root)
  const rootY = rootNode ? center(rootNode).y : 0
  const rx = (n: LayoutNode) => (th.leafy ? n.h / 2 : 12)

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={`${fit.paperW}mm`}
      height={`${fit.paperH}mm`}
      viewBox={`0 0 ${fit.paperW} ${fit.paperH}`}
      role="img"
      aria-label={t('chart.imageLabel', { title, count: people })}
      fontFamily={th.font}
      className="h-auto w-full bg-white"
    >
      <title>{title}</title>
      <rect width={fit.paperW} height={fit.paperH} fill={th.paper} />
      {th.frame && (
        <g fill="none" stroke={th.line}>
          <rect x={4} y={4} width={fit.paperW - 8} height={fit.paperH - 8} strokeWidth={0.6} />
          <rect x={5.5} y={5.5} width={fit.paperW - 11} height={fit.paperH - 11} strokeWidth={0.25} />
        </g>
      )}
      {title && (
        <g>
          {th.band && <rect width={fit.paperW} height={MARGIN_MM + TITLE_MM - 4} fill={th.line} />}
          <text
            x={cx}
            y={MARGIN_MM + 8}
            textAnchor="middle"
            fontSize={9}
            fontWeight={600}
            fontFamily={th.titleFont}
            letterSpacing={th.frame ? 0.3 : 0}
            fill={th.band ? '#ffffff' : th.ink}
          >
            {title}
          </text>
          {subtitle && (
            <text
              x={cx}
              y={MARGIN_MM + 14.5}
              textAnchor="middle"
              fontSize={3.6}
              fill={th.band ? '#ffffff' : th.muted}
            >
              {subtitle}
            </text>
          )}
          {!th.band && (
            <g stroke={th.line} strokeWidth={0.3}>
              <line x1={cx - 50} y1={MARGIN_MM + 17.5} x2={cx - 3} y2={MARGIN_MM + 17.5} />
              <line x1={cx + 3} y1={MARGIN_MM + 17.5} x2={cx + 50} y2={MARGIN_MM + 17.5} />
              {th.leafy ? (
                <g stroke="none">
                  <path
                    d={LEAF_PATH}
                    transform={`translate(${cx} ${MARGIN_MM + 17.5}) rotate(-160) scale(0.25)`}
                    fill={lightPalette.leaves[1]}
                  />
                  <path
                    d={LEAF_PATH}
                    transform={`translate(${cx} ${MARGIN_MM + 17.5}) rotate(-20) scale(0.25)`}
                    fill={lightPalette.leaves[3]}
                  />
                </g>
              ) : (
                <rect
                  x={cx - 1.1}
                  y={MARGIN_MM + 16.4}
                  width={2.2}
                  height={2.2}
                  fill={th.line}
                  transform={`rotate(45 ${cx} ${MARGIN_MM + 17.5})`}
                />
              )}
            </g>
          )}
        </g>
      )}
      <g transform={`translate(${fit.x} ${fit.y}) scale(${fit.scale}) translate(${-b.minX} ${-b.minY})`}>
        {th.leafy && <CanopyArt blobs={growCanopy(layout, { x: 0, y: 0 })} palette={lightPalette} />}
        <g fill="none" stroke={th.line} strokeWidth={2} strokeLinecap="round">
          {layout.edges.map((e) => {
            const s = byId.get(e.source)
            const d = byId.get(e.target)
            if (!s || !d) return null
            const [top, bottom] = center(s).y <= center(d).y ? [s, d] : [d, s]
            const upper = { x: center(top).x, y: top.y + top.h }
            const lower = { x: center(bottom).x, y: bottom.y }
            if (!th.leafy) return <path key={e.id} d={elbow(upper.x, upper.y, lower.x, lower.y)} />
            const { from, to, wFrom, wTo } = branchEnds(
              upper,
              lower,
              top.kind === 'junction',
              bottom.kind === 'junction',
              rootY,
            )
            return (
              <g key={e.id} stroke="none">
                <BranchArt shape={growBranch(from, to, wFrom, wTo, e.id)} palette={lightPalette} />
              </g>
            )
          })}
        </g>
        {layout.nodes.map((n) => {
          if (n.kind === 'canopy') return null
          if (n.kind === 'trunk') {
            return (
              <g key={n.id} transform={`translate(${n.x + n.w / 2} ${n.y})`}>
                <TrunkArt shape={growTrunk('trunk')} palette={lightPalette} />
              </g>
            )
          }
          if (n.kind === 'junction') {
            const c = center(n)
            if (th.leafy) {
              return <path key={n.id} d={HEART_PATH} transform={`translate(${c.x} ${c.y}) scale(1.3)`} fill="#be123c" />
            }
            return (
              <circle key={n.id} cx={c.x} cy={c.y} r={n.w / 2 - 1} fill={th.paper} stroke={th.line} strokeWidth={3} />
            )
          }
          if (n.kind === 'unknown') {
            return (
              <g key={n.id}>
                <rect
                  x={n.x}
                  y={n.y}
                  width={n.w}
                  height={n.h}
                  rx={rx(n)}
                  fill={th.paper}
                  stroke={th.line}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
                <text
                  x={n.x + n.w / 2}
                  y={n.y + n.h / 2 + 4}
                  textAnchor="middle"
                  fontSize={12}
                  fontStyle="italic"
                  fill={th.muted}
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
                  rx={rx(n)}
                  fill={th.card}
                  stroke={th.root}
                  strokeWidth={1.5}
                  strokeDasharray="6 4"
                />
                <text x={n.x + 8} y={n.y + n.h / 2 + 4} fontSize={11} fill={th.muted}>
                  {fitText(`↺ ${t('tree.repeat', { name })}`, n.w - 16, 11)}
                </text>
              </g>
            )
          }
          const src = photos ? photoUrl(p) : null
          const shown = src ? (photoSrc?.[src] ?? src) : null
          const textX = n.x + 16 + 40 + 8
          const textW = n.x + n.w - 6 - textX
          const clip = `wc-clip-${n.id}`
          const mark = p.sex === 'M' ? '♂ ' : p.sex === 'F' ? '♀ ' : ''
          return (
            <g key={n.id}>
              <clipPath id={`${clip}-card`}>
                <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={rx(n)} />
              </clipPath>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={rx(n)}
                fill={n.root ? th.rootFill : th.card}
                stroke={n.root ? th.root : th.cardStroke}
                strokeWidth={n.root ? 3 : 1.5}
              />
              {!th.leafy && th.sex[p.sex] && (
                <rect
                  x={n.x}
                  y={n.y}
                  width={6}
                  height={n.h}
                  fill={th.sex[p.sex]}
                  clipPath={`url(#${clip}-card)`}
                />
              )}
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
                  <circle cx={n.x + 16 + 20} cy={n.y + n.h / 2} r={20} fill={th.avatar} />
                  <text
                    x={n.x + 16 + 20}
                    y={n.y + n.h / 2 + 5}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight={600}
                    fill={th.avatarInk}
                  >
                    {[p.givenNames, p.surname].map((x) => x.trim()[0] ?? '').join('') || '?'}
                  </text>
                </>
              )}
              <text x={textX} y={n.y + 20} fontSize={11} fill={th.muted}>
                {fitText(mark + (p.givenNames.trim() || (p.surname.trim() ? '' : name)), textW, 11)}
              </text>
              <text x={textX} y={n.y + 36} fontSize={13} fontWeight={700} fill={th.ink}>
                {fitText(p.surname.trim(), textW, 13)}
              </text>
              <text x={textX} y={n.y + 52} fontSize={10.5} fill={th.muted}>
                {fitText(lifespan(p), textW, 10.5)}
              </text>
            </g>
          )
        })}
      </g>
    </svg>
  )
})
