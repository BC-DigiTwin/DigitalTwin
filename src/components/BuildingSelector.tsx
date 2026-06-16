import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildKnownCampusBuildings,
  campusBuildingLabel,
  campusBuildingMenuGlyph,
  isParkingGarageBuilding,
} from '../utils/campusBuildingLabel'
import { useStore } from '../store/useStore'

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M4 17V8.5l6-4 6 4V17"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 17v-4h4v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * Building picker for the bottom toolbar — sets `selectedEntity` exactly like
 * clicking a building mesh in the scene.
 */
export function BuildingSelector() {
  const campusBuildings = useStore((s) => s.campusBuildings)
  const selectedEntity = useStore((s) => s.selectedEntity)
  const setSelectedEntity = useStore((s) => s.setSelectedEntity)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const { letterBuildings, garage } = useMemo(() => {
    const all = buildKnownCampusBuildings(campusBuildings)
    const letters = all.filter((b) => !isParkingGarageBuilding(b.id))
    const garageBuilding = all.find((b) => isParkingGarageBuilding(b.id)) ?? null
    return { letterBuildings: letters, garage: garageBuilding }
  }, [campusBuildings])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (letterBuildings.length === 0 && !garage) return null

  const pickBuilding = (id: string) => {
    setSelectedEntity(id)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-9 min-w-[10.5rem] items-center justify-center gap-1.5 rounded-full border border-white/15 px-4 text-sm font-medium shadow-lg backdrop-blur-2xl transition hover:bg-neutral-900/85 ${
          open
            ? 'bg-white/15 text-white ring-1 ring-white/25'
            : 'bg-neutral-950/65 text-white'
        }`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Go to building"
      >
        <BuildingIcon className="h-4 w-4 shrink-0 text-white/70" />
        <span className="whitespace-nowrap">Go to Building</span>
        <ChevronIcon
          className={`h-3.5 w-3.5 shrink-0 text-white/55 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Choose a building"
          className="absolute bottom-full left-0 z-50 mb-2 min-w-[12.5rem] rounded-2xl border border-white/15 bg-neutral-950/80 p-2.5 shadow-2xl backdrop-blur-2xl"
        >
          {letterBuildings.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {letterBuildings.map((b) => {
                const glyph = campusBuildingMenuGlyph(b.id)
                const selected = selectedEntity === b.id
                return (
                  <button
                    key={b.id}
                    type="button"
                    role="menuitem"
                    title={campusBuildingLabel(b.id)}
                    aria-label={campusBuildingLabel(b.id)}
                    onClick={() => pickBuilding(b.id)}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border text-base font-semibold tabular-nums transition hover:bg-white/15 ${
                      selected
                        ? 'border-sky-300/60 bg-sky-400/20 text-white ring-1 ring-sky-300/40'
                        : 'border-white/15 bg-white/8 text-white/90'
                    }`}
                  >
                    {glyph}
                  </button>
                )
              })}
            </div>
          )}

          {garage && (
            <button
              type="button"
              role="menuitem"
              title="Parking Garage"
              aria-label="Parking Garage"
              onClick={() => pickBuilding(garage.id)}
              className={`mt-2 flex w-full items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition hover:bg-white/15 ${
                selectedEntity === garage.id
                  ? 'border-sky-300/60 bg-sky-400/20 text-white ring-1 ring-sky-300/40'
                  : 'border-white/15 bg-white/8 text-white/90'
              }`}
            >
              Parking Garage
            </button>
          )}
        </div>
      )}
    </div>
  )
}
