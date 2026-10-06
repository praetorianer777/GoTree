import { LEAF_PATH, type Blob, type BranchShape, type Leaf, type Palette, type TrunkShape } from './branches'

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

/** A grown branch; decoration only, the cards and the list view say who is related. */
export function BranchArt({ shape, palette }: { shape: BranchShape; palette: Palette }) {
  return (
    <g aria-hidden="true">
      {shape.twigs.map((d) => (
        <path key={d} d={d} fill={palette.bark} />
      ))}
      <path d={shape.outline} fill={palette.bark} stroke={palette.barkDark} strokeWidth={0.8} />
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
      <path d={shape.trunk} fill={palette.bark} stroke={palette.barkDark} strokeWidth={1} />
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

export function CanopyArt({ blobs, palette }: { blobs: Blob[]; palette: Palette }) {
  return (
    <g aria-hidden="true" opacity={palette.canopyOpacity}>
      {blobs.map((b) => (
        <ellipse key={`${b.cx},${b.cy}`} cx={b.cx} cy={b.cy} rx={b.rx} ry={b.ry} fill={palette.canopy[b.shade]} />
      ))}
    </g>
  )
}
