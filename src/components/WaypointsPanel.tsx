import { useEffect, useMemo, useState } from 'react'
import { useStore, type CampusBuilding } from '../store/useStore'
import { mockBuildings } from '../../lib/mockDatabase'
import {
  WAYPOINT_CATEGORIES,
  WAYPOINT_CATEGORY_META,
  exportWaypointsAsTsSnippet,
  generateDummyWaypointsForBuildings,
  type Waypoint,
  type WaypointCategory,
} from '../../lib/mockWaypoints'

/* ── Display helpers ─────────────────────────────────────────────────── */

const UNASSIGNED_KEY = '__unassigned__'

/**
 * Title-cases a raw building id when no nicer name is available.
 * `building_garage` → `Building Garage`, `building_g` → `Building G`.
 */
function prettifyBuildingId(id: string): string {
  return id
    .split('_')
    .map((part) =>
      part.length <= 1
        ? part.toUpperCase()
        : part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ')
}

/**
 * Best display name for a building id, in priority order:
 *   1. Mock DB row name (`Building A` …) — nicest, curated.
 *   2. Name reported by the runtime registry (from the GLB).
 *   3. Title-cased id fallback.
 */
function buildingDisplayName(
  id: string,
  registry: readonly CampusBuilding[],
): string {
  const mock = mockBuildings.find((b) => b.id === id)
  if (mock?.name) return mock.name
  const reg = registry.find((b) => b.id === id)
  if (reg?.name && reg.name !== id) return prettifyBuildingId(reg.name)
  return prettifyBuildingId(id)
}

/**
 * Ordered, de-duplicated list of every building the UI should offer: the mock
 * A–E first (stable, curated order), then any additional buildings the loaded
 * model reported, sorted by id. Keeps the panel correct as the model grows.
 */
function buildKnownBuildings(
  registry: readonly CampusBuilding[],
): CampusBuilding[] {
  const seen = new Set<string>()
  const out: CampusBuilding[] = []

  for (const b of mockBuildings) {
    if (seen.has(b.id)) continue
    seen.add(b.id)
    out.push({ id: b.id, name: b.name ?? prettifyBuildingId(b.id) })
  }

  const extras = registry
    .filter((b) => !seen.has(b.id))
    .sort((a, b) => a.id.localeCompare(b.id))
  for (const b of extras) {
    seen.add(b.id)
    out.push({ id: b.id, name: prettifyBuildingId(b.name || b.id) })
  }

  return out
}

function defaultLabel(wp: Waypoint): string {
  if (wp.label && wp.label.trim().length > 0) return wp.label
  return `${WAYPOINT_CATEGORY_META[wp.category].label}`
}

/* ── Panel ───────────────────────────────────────────────────────────── */

/**
 * Floating left-edge waypoint manager.
 *
 *   • Toggle: expand/collapse from a compact pill on the lower-left.
 *   • Expanded: category filter chips, placement-mode toggle + draft
 *     category dropdown, waypoint list grouped by building, and an export
 *     button that copies a `mockWaypoints.ts` snippet to the clipboard.
 *   • Clicking any row sets `selectedWaypointId`, which `WaypointsGroup`
 *     observes to fly the camera to that waypoint.
 *
 * The panel mounts outside the `<Canvas>` (it's pure HTML), but it reads
 * and writes through the same Zustand store that the scene consumes.
 */
export function WaypointsPanel() {
  const [open, setOpen] = useState(true)

  const waypoints = useStore((s) => s.waypoints)
  const selectedWaypointId = useStore((s) => s.selectedWaypointId)
  const setSelectedWaypointId = useStore((s) => s.setSelectedWaypointId)
  const hoveredWaypointId = useStore((s) => s.hoveredWaypointId)
  const setHoveredWaypointId = useStore((s) => s.setHoveredWaypointId)
  const placementMode = useStore((s) => s.waypointPlacementMode)
  const setWaypointPlacementMode = useStore((s) => s.setWaypointPlacementMode)
  const draftCategory = useStore((s) => s.waypointDraftCategory)
  const setWaypointDraftCategory = useStore((s) => s.setWaypointDraftCategory)
  const categoryFilters = useStore((s) => s.waypointCategoryFilters)
  const toggleWaypointCategoryFilter = useStore(
    (s) => s.toggleWaypointCategoryFilter,
  )
  const updateWaypoint = useStore((s) => s.updateWaypoint)
  const removeWaypoint = useStore((s) => s.removeWaypoint)
  const setWaypoints = useStore((s) => s.setWaypoints)
  const layerVisible = useStore((s) => s.layers.waypoints)
  const setLayerVisible = useStore((s) => s.setLayerVisible)
  const campusBuildings = useStore((s) => s.campusBuildings)
  const selectedEntity = useStore((s) => s.selectedEntity)

  const [exportStatus, setExportStatus] = useState<
    'idle' | 'copied' | 'failed'
  >('idle')

  // Two-click guard for the destructive "replace all with dummy points" action.
  const [confirmRegen, setConfirmRegen] = useState(false)

  // Selecting a building in the scene focuses the panel on that building's
  // waypoints. The user can dismiss focus ("Show all") without clearing the
  // 3D building selection; picking a *different* building re-activates it.
  const [dismissedBuildingFocus, setDismissedBuildingFocus] = useState<
    string | null
  >(null)
  const focusBuildingId =
    selectedEntity && selectedEntity !== dismissedBuildingFocus
      ? selectedEntity
      : null

  // Surface the panel when a building selection focuses it.
  useEffect(() => {
    if (focusBuildingId) setOpen(true)
  }, [focusBuildingId])

  /** All buildings the model + mock data expose, in a stable display order. */
  const knownBuildings = useMemo(
    () => buildKnownBuildings(campusBuildings),
    [campusBuildings],
  )

  const grouped = useMemo(() => {
    const visible = waypoints.filter((w) => categoryFilters[w.category])
    const buckets = new Map<string, Waypoint[]>()
    for (const wp of visible) {
      const key = wp.buildingId ?? UNASSIGNED_KEY
      const list = buckets.get(key) ?? []
      list.push(wp)
      buckets.set(key, list)
    }
    // Known buildings first (in registry order), then any building id that has
    // waypoints but isn't in the registry (e.g. a renamed/removed mesh), then
    // the unassigned bucket. This way nothing silently disappears from the list.
    const knownIds = knownBuildings.map((b) => b.id)
    const orphanIds = [...buckets.keys()].filter(
      (k) => k !== UNASSIGNED_KEY && !knownIds.includes(k),
    )
    let orderedKeys = [
      ...knownIds.filter((id) => buckets.has(id)),
      ...orphanIds,
      ...(buckets.has(UNASSIGNED_KEY) ? [UNASSIGNED_KEY] : []),
    ]
    // When a building is focused (selected in the scene), narrow the list to
    // just that building's waypoints.
    if (focusBuildingId) {
      orderedKeys = orderedKeys.filter((k) => k === focusBuildingId)
    }
    return orderedKeys.map((key) => ({
      key,
      label:
        key === UNASSIGNED_KEY
          ? 'Unassigned'
          : buildingDisplayName(key, campusBuildings),
      items: (buckets.get(key) ?? []).slice().sort((a, b) => {
        const ac = WAYPOINT_CATEGORIES.indexOf(a.category)
        const bc = WAYPOINT_CATEGORIES.indexOf(b.category)
        if (ac !== bc) return ac - bc
        return defaultLabel(a).localeCompare(defaultLabel(b))
      }),
    }))
  }, [waypoints, categoryFilters, knownBuildings, campusBuildings, focusBuildingId])

  const categoryCounts = useMemo(() => {
    const counts: Record<WaypointCategory, number> = {
      entrance: 0,
      stairs: 0,
      bathroom: 0,
    }
    for (const wp of waypoints) counts[wp.category] += 1
    return counts
  }, [waypoints])

  /** Buildings whose footprint has been measured (and so can host points). */
  const measuredBuildingCount = useMemo(
    () => campusBuildings.filter((b) => b.cx !== undefined).length,
    [campusBuildings],
  )

  const handleGenerateDummy = () => {
    if (!confirmRegen) {
      setConfirmRegen(true)
      window.setTimeout(() => setConfirmRegen(false), 3500)
      return
    }
    setConfirmRegen(false)
    const generated = generateDummyWaypointsForBuildings(campusBuildings)
    if (generated.length === 0) return
    setWaypoints(generated)
    setSelectedWaypointId(null)
    setDismissedBuildingFocus(null)
  }

  const handleExport = async () => {
    const snippet = exportWaypointsAsTsSnippet(waypoints)
    try {
      await navigator.clipboard.writeText(snippet)
      setExportStatus('copied')
      window.setTimeout(() => setExportStatus('idle'), 1800)
    } catch {
      setExportStatus('failed')
      window.setTimeout(() => setExportStatus('idle'), 2400)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-white/15 bg-neutral-950/65 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-2xl hover:bg-neutral-900/80"
        aria-label="Open waypoints panel"
      >
        <PinIcon className="h-4 w-4" />
        Waypoints
        <span className="ml-1 rounded-full bg-white/12 px-2 py-0.5 text-xs">
          {waypoints.length}
        </span>
      </button>
    )
  }

  return (
    <aside
      className="fixed bottom-4 left-4 top-4 z-40 flex w-80 flex-col overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/55 text-white shadow-2xl backdrop-blur-3xl backdrop-saturate-150"
      aria-label="Campus waypoints"
    >
      {/* Header */}
      <header className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <PinIcon className="h-4 w-4 text-white/80" />
        <h2 className="flex-1 text-sm font-semibold tracking-tight">
          Waypoints
        </h2>
        <button
          type="button"
          onClick={() => setLayerVisible('waypoints', !layerVisible)}
          className={`rounded-md px-2 py-1 text-xs font-medium ring-1 transition ${
            layerVisible
              ? 'bg-white/10 text-white ring-white/20 hover:bg-white/15'
              : 'bg-white/5 text-white/55 ring-white/12 hover:bg-white/10'
          }`}
          title={layerVisible ? 'Hide all markers in scene' : 'Show markers in scene'}
        >
          {layerVisible ? 'Visible' : 'Hidden'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex h-7 w-7 items-center justify-center rounded-md bg-white/8 text-white/90 ring-1 ring-white/15 hover:bg-white/15"
          aria-label="Collapse panel"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>
      </header>

      {/* Placement controls */}
      <section className="shrink-0 space-y-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs uppercase tracking-wider text-white/55">
            Placement mode
          </span>
          <button
            type="button"
            onClick={() => setWaypointPlacementMode(!placementMode)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ring-1 transition ${
              placementMode
                ? 'bg-emerald-400/85 text-emerald-950 ring-emerald-300 hover:bg-emerald-300'
                : 'bg-white/8 text-white ring-white/15 hover:bg-white/15'
            }`}
            aria-pressed={placementMode}
          >
            {placementMode ? 'On — Click ground' : 'Off'}
          </button>
        </div>

        <label className="flex items-center justify-between gap-2 text-xs">
          <span className="text-white/65">New marker category</span>
          <select
            value={draftCategory}
            onChange={(e) =>
              setWaypointDraftCategory(e.target.value as WaypointCategory)
            }
            className="rounded-md bg-white/8 px-2 py-1 text-xs text-white ring-1 ring-white/15 hover:bg-white/12"
          >
            {WAYPOINT_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-neutral-900">
                {WAYPOINT_CATEGORY_META[c].label}
              </option>
            ))}
          </select>
        </label>

        {placementMode && (
          <p className="text-[11px] leading-relaxed text-white/55">
            Click open ground to place. Drag the gizmo on a selected pin to
            move it; Y always snaps to terrain.
          </p>
        )}

        <div className="border-t border-white/10 pt-3">
          <button
            type="button"
            onClick={handleGenerateDummy}
            disabled={measuredBuildingCount === 0}
            className={`w-full rounded-md px-3 py-2 text-xs font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
              confirmRegen
                ? 'bg-amber-400/90 text-amber-950 ring-amber-300 hover:bg-amber-300'
                : 'bg-white/8 text-white ring-white/15 hover:bg-white/15'
            }`}
            title="Replace every waypoint with a fresh set placed inside each building"
          >
            {confirmRegen
              ? `Replace all ${waypoints.length} with ${measuredBuildingCount * 3} dummy points? Click to confirm`
              : `Place dummy points in all buildings (${measuredBuildingCount})`}
          </button>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
            Adds an entrance, stairs &amp; restroom inside each building's
            footprint. Overwrites the current list.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="shrink-0 border-b border-white/10 px-4 py-3">
        <span className="mb-2 block text-xs uppercase tracking-wider text-white/55">
          Filter
        </span>
        <div className="flex flex-wrap gap-1.5">
          {WAYPOINT_CATEGORIES.map((c) => {
            const on = categoryFilters[c]
            const meta = WAYPOINT_CATEGORY_META[c]
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleWaypointCategoryFilter(c)}
                aria-pressed={on}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition ${
                  on
                    ? 'bg-white/12 text-white ring-white/22'
                    : 'bg-white/4 text-white/45 ring-white/10 hover:text-white/70'
                }`}
                style={
                  on
                    ? { boxShadow: `inset 0 0 0 1px ${meta.color}55` }
                    : undefined
                }
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                {meta.label}
                <span className="text-white/45">{categoryCounts[c]}</span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Building focus banner — shown when a building is selected in the scene */}
      {focusBuildingId && (
        <div className="flex shrink-0 items-center gap-2 border-b border-sky-400/20 bg-sky-400/10 px-4 py-2.5">
          <BuildingIcon className="h-4 w-4 shrink-0 text-sky-300" />
          <span className="min-w-0 flex-1 truncate text-xs text-white/85">
            Showing{' '}
            <span className="font-semibold text-white">
              {buildingDisplayName(focusBuildingId, campusBuildings)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setDismissedBuildingFocus(focusBuildingId)}
            className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-[11px] font-medium text-white ring-1 ring-white/15 transition hover:bg-white/18"
          >
            Show all
          </button>
        </div>
      )}

      {/* List grouped by building */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {grouped.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-white/45">
            {focusBuildingId
              ? `No waypoints in ${buildingDisplayName(focusBuildingId, campusBuildings)} yet. Turn on Placement mode and click the ground near it to add one.`
              : 'No waypoints match the current filter.'}
          </p>
        ) : (
          grouped.map((group) => (
            <section key={group.key} className="mb-3">
              <h3 className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/55">
                {group.label}
                <span className="ml-1.5 font-normal text-white/35">
                  · {group.items.length}
                </span>
              </h3>
              <ul className="space-y-0.5">
                {group.items.map((wp) => {
                  const isSelected = wp.id === selectedWaypointId
                  const isHovered = wp.id === hoveredWaypointId
                  const meta = WAYPOINT_CATEGORY_META[wp.category]
                  return (
                    <li key={wp.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedWaypointId(wp.id)}
                        onMouseEnter={() => setHoveredWaypointId(wp.id)}
                        onMouseLeave={() => {
                          // Only clear if we still own the hover (avoids
                          // stomping a hover set by the 3D marker).
                          if (useStore.getState().hoveredWaypointId === wp.id) {
                            setHoveredWaypointId(null)
                          }
                        }}
                        className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition ${
                          isSelected
                            ? 'bg-white/14 text-white ring-1 ring-white/25'
                            : isHovered
                              ? 'bg-white/10 text-white ring-1 ring-white/15'
                              : 'text-white/85 hover:bg-white/8'
                        }`}
                      >
                        <span
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase ring-1 transition-transform duration-150"
                          style={{
                            color: meta.color,
                            borderColor: `${meta.color}55`,
                            boxShadow:
                              isSelected || isHovered
                                ? `0 0 0 1px ${meta.color}`
                                : undefined,
                            transform: isHovered ? 'scale(1.12)' : undefined,
                          }}
                        >
                          {meta.label.slice(0, 2)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {defaultLabel(wp)}
                          </span>
                          <span className="block truncate text-[10px] text-white/45">
                            {meta.label} · {wp.x.toFixed(1)}, {wp.z.toFixed(1)}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </div>

      {/* Selected-waypoint editor */}
      {selectedWaypointId && (
        <SelectedWaypointEditor
          waypoint={
            waypoints.find((w) => w.id === selectedWaypointId) ?? null
          }
          buildings={knownBuildings}
          onUpdate={(id, partial) => updateWaypoint(id, partial)}
          onDelete={(id) => removeWaypoint(id)}
        />
      )}

      {/* Export footer */}
      <footer className="shrink-0 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={handleExport}
          className="w-full rounded-md bg-white/8 px-3 py-2 text-xs font-medium text-white ring-1 ring-white/15 transition hover:bg-white/14"
          title="Copy current waypoints as a TS snippet to paste into lib/mockWaypoints.ts"
        >
          {exportStatus === 'copied'
            ? 'Copied — paste into lib/mockWaypoints.ts'
            : exportStatus === 'failed'
              ? 'Clipboard blocked — try again'
              : 'Export as mockWaypoints.ts snippet'}
        </button>
      </footer>
    </aside>
  )
}

/* ── Selected-waypoint editor ────────────────────────────────────────── */

interface SelectedWaypointEditorProps {
  waypoint: Waypoint | null
  /** Buildings available for assignment (mock + runtime registry). */
  buildings: readonly CampusBuilding[]
  onUpdate: (id: string, partial: Partial<Omit<Waypoint, 'id'>>) => void
  onDelete: (id: string) => void
}

function SelectedWaypointEditor({
  waypoint,
  buildings,
  onUpdate,
  onDelete,
}: SelectedWaypointEditorProps) {
  if (!waypoint) return null

  // If the waypoint references a building no longer in the model, keep it as a
  // selectable option so the assignment doesn't silently reset on edit.
  const hasCurrent =
    !waypoint.buildingId ||
    buildings.some((b) => b.id === waypoint.buildingId)
  const buildingOptions = [
    { id: '', name: 'Unassigned' },
    ...buildings,
    ...(hasCurrent || !waypoint.buildingId
      ? []
      : [{ id: waypoint.buildingId, name: `${waypoint.buildingId} (missing)` }]),
  ]

  return (
    <section className="shrink-0 space-y-2 border-t border-white/10 bg-white/4 px-4 py-3">
      <header className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-white/55">
          Editing
        </span>
        <button
          type="button"
          onClick={() => onDelete(waypoint.id)}
          className="rounded-md bg-rose-500/15 px-2 py-1 text-[11px] font-medium text-rose-200 ring-1 ring-rose-400/30 hover:bg-rose-500/25"
        >
          Delete
        </button>
      </header>

      <label className="block text-xs">
        <span className="mb-1 block text-white/55">Label</span>
        <input
          type="text"
          value={waypoint.label ?? ''}
          onChange={(e) => onUpdate(waypoint.id, { label: e.target.value })}
          placeholder={WAYPOINT_CATEGORY_META[waypoint.category].label}
          className="w-full rounded-md bg-white/6 px-2 py-1.5 text-xs text-white ring-1 ring-white/12 outline-none placeholder:text-white/30 focus:bg-white/10 focus:ring-white/30"
        />
      </label>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="block">
          <span className="mb-1 block text-white/55">Category</span>
          <select
            value={waypoint.category}
            onChange={(e) =>
              onUpdate(waypoint.id, {
                category: e.target.value as WaypointCategory,
              })
            }
            className="w-full rounded-md bg-white/6 px-2 py-1.5 text-xs text-white ring-1 ring-white/12"
          >
            {WAYPOINT_CATEGORIES.map((c) => (
              <option key={c} value={c} className="bg-neutral-900">
                {WAYPOINT_CATEGORY_META[c].label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-white/55">Building</span>
          <select
            value={waypoint.buildingId ?? ''}
            onChange={(e) =>
              onUpdate(waypoint.id, {
                buildingId: e.target.value === '' ? null : e.target.value,
              })
            }
            className="w-full rounded-md bg-white/6 px-2 py-1.5 text-xs text-white ring-1 ring-white/12"
          >
            {buildingOptions.map((b) => (
              <option key={b.id || 'none'} value={b.id} className="bg-neutral-900">
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="pt-1 text-[10px] text-white/40">
        Position: ({waypoint.x.toFixed(2)}, {waypoint.z.toFixed(2)}) — drag the
        gizmo in placement mode to move.
      </p>
    </section>
  )
}

/* ── Icons ───────────────────────────────────────────────────────────── */

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path d="M8 1.25c-2.62 0-4.75 2.12-4.75 4.75 0 3.7 4.05 8.04 4.4 8.4a.5.5 0 00.7 0c.35-.36 4.4-4.7 4.4-8.4 0-2.63-2.13-4.75-4.75-4.75zm0 6.5a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5z" />
    </svg>
  )
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M3 1.5A1.5 1.5 0 014.5 0h7A1.5 1.5 0 0113 1.5V15h1.25a.75.75 0 010 1.5H1.75a.75.75 0 010-1.5H3V1.5zm3 2A.75.75 0 016.75 3h.5a.75.75 0 010 1.5h-.5A.75.75 0 016 3.5zm3.75-.5a.75.75 0 000 1.5h.5a.75.75 0 000-1.5h-.5zM6 6.75A.75.75 0 016.75 6h.5a.75.75 0 010 1.5h-.5A.75.75 0 016 6.75zm3.75-.75a.75.75 0 000 1.5h.5a.75.75 0 000-1.5h-.5zM6.75 12a.75.75 0 00-.75.75V15h4v-2.25a.75.75 0 00-.75-.75h-2.5z"
        clipRule="evenodd"
      />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M12.79 4.21a.75.75 0 010 1.06L8.06 10l4.73 4.73a.75.75 0 11-1.06 1.06l-5.26-5.26a.75.75 0 010-1.06l5.26-5.26a.75.75 0 011.06 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}
