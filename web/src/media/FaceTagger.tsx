import { useRef, useState, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import type { Media, MediaRegion } from '../api/types'
import { fullName } from '../lib/people'

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

interface Props {
  media: Media
  src: string
  alt: string
  /** Drawing mode: dragging on the image draws a new box. */
  drawing: boolean
  onDrawn: (box: Box) => void
  selectedRegion: number | null
  onSelectRegion: (id: number) => void
  pending: Box | null
}

const clamp = (v: number) => Math.max(0, Math.min(1, v))

/** A photo with its face tags as boxes; in drawing mode a drag adds one. */
export function FaceTagger({ media, src, alt, drawing, onDrawn, selectedRegion, onSelectRegion, pending }: Props) {
  const { t } = useTranslation()
  const surface = useRef<HTMLDivElement>(null)
  const [start, setStart] = useState<{ x: number; y: number } | null>(null)
  const [current, setCurrent] = useState<Box | null>(null)

  const point = (e: PointerEvent) => {
    const r = surface.current!.getBoundingClientRect()
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) }
  }
  const boxFrom = (a: { x: number; y: number }, b: { x: number; y: number }): Box => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  })

  const label = (r: MediaRegion) =>
    r.person ? (fullName(r.person) ?? t('person.unknown')) : r.name || t('media.unnamedFace')

  return (
    <div className="relative inline-block max-w-full">
      <img src={src} alt={alt} className="block max-h-[70dvh] max-w-full select-none" draggable={false} />
      <div ref={surface} className="absolute inset-0">
        {media.regions.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => onSelectRegion(r.id)}
            aria-pressed={selectedRegion === r.id}
            title={label(r)}
            style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}
            className={[
              'absolute rounded border-2 shadow-[0_0_0_1px_rgba(0,0,0,0.6)]',
              selectedRegion === r.id ? 'border-amber-400' : r.person ? 'border-white' : 'border-dashed border-white',
            ].join(' ')}
          >
            <span className="sr-only">{t('media.faceOf', { name: label(r) })}</span>
          </button>
        ))}
        {(current ?? pending) && (
          <div
            aria-hidden="true"
            style={{
              left: `${(current ?? pending)!.x * 100}%`,
              top: `${(current ?? pending)!.y * 100}%`,
              width: `${(current ?? pending)!.w * 100}%`,
              height: `${(current ?? pending)!.h * 100}%`,
            }}
            className="pointer-events-none absolute rounded border-2 border-amber-400 bg-amber-400/20"
          />
        )}
        {drawing && (
          // Pointer drawing has a keyboard alternative next to the photo
          // ("tag without a box"), so this surface needs no key handling.
          <div
            aria-hidden="true"
            className="absolute inset-0 cursor-crosshair touch-none"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              const p = point(e)
              setStart(p)
              setCurrent({ ...p, w: 0, h: 0 })
            }}
            onPointerMove={(e) => start && setCurrent(boxFrom(start, point(e)))}
            onPointerUp={(e) => {
              if (!start) return
              const box = boxFrom(start, point(e))
              setStart(null)
              setCurrent(null)
              if (box.w > 0.01 && box.h > 0.01) onDrawn(box)
            }}
          />
        )}
      </div>
    </div>
  )
}
