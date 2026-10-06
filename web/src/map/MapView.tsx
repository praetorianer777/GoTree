import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import type { MapData } from '../api/types'

interface Props {
  data: MapData
  positions: Map<number, number[]>
  year: number
}

/**
 * The Leaflet map: one circle per place, sized by how many people were
 * there. It is the visual companion of the table next to it, which holds
 * the same information for everyone.
 */
export default function MapView({ data, positions, year }: Props) {
  const { t } = useTranslation()
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!box.current) return
    const m = L.map(box.current, { scrollWheelZoom: false, keyboard: true })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    return () => {
      m.remove()
      map.current = null
    }
  }, [])

  // Fit to all places of the data once, not to each year, so the map holds
  // still while it plays.
  useEffect(() => {
    const places = Object.values(data.places)
    if (!map.current || places.length === 0) return
    map.current.fitBounds(L.latLngBounds(places.map((p) => [p.lat, p.lng])), { padding: [24, 24], maxZoom: 10 })
  }, [data])

  useEffect(() => {
    const group = layer.current
    if (!group) return
    group.clearLayers()
    for (const [placeId, people] of positions) {
      const place = data.places[placeId]
      if (!place) continue
      L.circleMarker([place.lat, place.lng], {
        radius: 6 + Math.sqrt(people.length) * 4,
        color: '#0f5c7a',
        weight: 2,
        fillColor: '#1d7fa3',
        fillOpacity: 0.55,
      })
        .bindTooltip(`${place.name}: ${people.length}`)
        .addTo(group)
    }
  }, [positions, data])

  return <div ref={box} aria-label={t('map.mapLabel', { year })} role="region" className="h-[60dvh] min-h-80 w-full rounded-xl" />
}
