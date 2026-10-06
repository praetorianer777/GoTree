import { VINE_LEAF, type Palette, type Vine } from './vine'

/** A vine connecting relatives; the cards and the list view say who is related. */
export function VineArt({ vine, palette }: { vine: Vine; palette: Palette }) {
  return (
    <g>
      <path d={vine.stem} fill="none" stroke={palette.stem} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      <g fill="none" stroke={palette.stem} strokeWidth={0.8} strokeLinecap="round">
        {vine.curls.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {vine.leaves.map((l) => (
        <path
          key={`${l.x},${l.y}`}
          d={VINE_LEAF}
          transform={`translate(${l.x} ${l.y}) rotate(${l.angle}) scale(${l.scale})`}
          fill={palette.leaves[l.shade]}
        />
      ))}
    </g>
  )
}
