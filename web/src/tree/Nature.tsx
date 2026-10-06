import { LEAF_PATH, type BranchShape, type Canopy, type Leaf, type Palette, type TrunkShape } from './branches'

export function Leaves({ leaves, palette }: { leaves: Leaf[]; palette: Palette }) {
  return (
    <g stroke={palette.leafEdge} strokeWidth={0.5}>
      {leaves.map((l) => (
        <path
          key={`${l.x},${l.y},${l.angle}`}
          d={LEAF_PATH}
          transform={`translate(${l.x} ${l.y}) rotate(${l.angle}) scale(${l.scale})`}
          fill={palette.leaves[l.shade]}
        />
      ))}
    </g>
  )
}

const rgb = (hex: string) => [1, 3, 5].map((i) => (Number.parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3))

/**
 * Bark grain and leafy roughness as SVG noise filters: they scale with the
 * drawing, print sharp and cost nothing to download. Rendered once per
 * document; the art refers to them by id.
 */
export function TextureDefs({ palette }: { palette: Palette }) {
  const [br, bg, bb] = rgb(palette.barkDark)
  const [lr, lg, lb] = rgb(palette.barkLight)
  const [fr, fg, fb] = rgb(palette.canopyShadow)
  const [hr, hg, hb] = rgb(palette.leaves[palette.leaves.length - 1] ?? '#ffffff')
  const grain = (id: string, freq: string) => (
    <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={3} seed={4} result="noise" />
      <feColorMatrix in="noise" type="matrix" values={`0 0 0 0 ${br} 0 0 0 0 ${bg} 0 0 0 0 ${bb} 0 0 0 -3 1.55`} result="dark" />
      <feColorMatrix in="noise" type="matrix" values={`0 0 0 0 ${lr} 0 0 0 0 ${lg} 0 0 0 0 ${lb} 0 0 0 3 -1.75`} result="light" />
      <feMerge result="streaks">
        <feMergeNode in="dark" />
        <feMergeNode in="light" />
      </feMerge>
      <feComposite in="streaks" in2="SourceAlpha" operator="in" result="grain" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="grain" />
      </feMerge>
    </filter>
  )
  return (
    <defs>
      {grain('gt-bark', '0.03 0.45')}
      {grain('gt-bark-v', '0.3 0.025')}
      <filter id="gt-foliage" x="-10%" y="-15%" width="120%" height="130%">
        <feTurbulence type="fractalNoise" baseFrequency="0.07" numOctaves={3} seed={9} result="edge" />
        <feDisplacementMap in="SourceGraphic" in2="edge" scale={7} xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves={2} seed={2} result="spots" />
        <feColorMatrix in="spots" type="matrix" values={`0 0 0 0 ${fr} 0 0 0 0 ${fg} 0 0 0 0 ${fb} 0 0 0 -2.4 1.25`} result="shade" />
        <feColorMatrix in="spots" type="matrix" values={`0 0 0 0 ${hr} 0 0 0 0 ${hg} 0 0 0 0 ${hb} 0 0 0 2.2 -1.5`} result="glow" />
        <feMerge result="mottle">
          <feMergeNode in="shade" />
          <feMergeNode in="glow" />
        </feMerge>
        <feComposite in="mottle" in2="rough" operator="in" result="inside" />
        <feMerge>
          <feMergeNode in="rough" />
          <feMergeNode in="inside" />
        </feMerge>
      </filter>
    </defs>
  )
}

/** A grown branch; decoration only, the cards and the list view say who is related. */
export function BranchArt({ shape, palette }: { shape: BranchShape; palette: Palette }) {
  return (
    <g aria-hidden="true">
      {shape.twigs.map((d) => (
        <path key={d} d={d} fill={palette.bark} />
      ))}
      <path d={shape.outline} fill={palette.bark} stroke={palette.barkDark} strokeWidth={0.8} filter="url(#gt-bark)" />
      <path d={shape.highlight} fill="none" stroke={palette.barkLight} strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
      <g fill="none" stroke={palette.barkDark} strokeWidth={0.9} strokeLinecap="round">
        {shape.bark.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <Leaves leaves={shape.leaves} palette={palette} />
    </g>
  )
}

export function TrunkArt({ shape, palette }: { shape: TrunkShape; palette: Palette }) {
  return (
    <g aria-hidden="true">
      <path d={shape.ground} fill={palette.grass} />
      {shape.roots.map((d) => (
        <path key={d} d={d} fill={palette.bark} stroke={palette.barkDark} strokeWidth={0.8} />
      ))}
      <path d={shape.trunk} fill={palette.bark} stroke={palette.barkDark} strokeWidth={1} filter="url(#gt-bark-v)" />
      <path d={shape.lit} fill={palette.barkLight} opacity={0.55} />
      <g fill="none" stroke={palette.barkDark} strokeWidth={1.2} strokeLinecap="round">
        {shape.bark.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      <g fill="none" stroke={palette.grassDark} strokeWidth={1.2} strokeLinecap="round">
        {shape.blades.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </g>
  )
}

export function CanopyArt({ canopy, palette }: { canopy: Canopy; palette: Palette }) {
  return (
    <g aria-hidden="true">
      {canopy.shadows.map((d) => (
        <path key={d} d={d} fill={palette.canopyShadow} filter="url(#gt-foliage)" />
      ))}
      {canopy.bodies.map((d) => (
        <path key={d} d={d} fill={palette.canopy} filter="url(#gt-foliage)" />
      ))}
      <Leaves leaves={canopy.leaves} palette={palette} />
    </g>
  )
}
