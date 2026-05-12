import { useMemo, useState } from 'react'
import type { BuildingApiData } from '../../lib/mockDatabase'

export type { BuildingApiData }

type SidePanelProps = {
  buildingData: BuildingApiData | null
  onClose: () => void
}

/**
 * Two-section building panel:
 *   1. Static header  → image, name, primary purpose, operating hours
 *   2. Dynamic nav    → tab buttons generated from `menu_tabs` keys, and a body
 *                       that renders the selected tab's value (string → <p>,
 *                       array → <ul>).
 */
export function SidePanel({ buildingData, onClose }: SidePanelProps) {
  const tabKeys = useMemo<string[]>(
    () =>
      buildingData?.menu_tabs ? Object.keys(buildingData.menu_tabs) : [],
    [buildingData],
  )

  // User's explicit pick. We *derive* the visible tab from this + the current
  // key set, so re-renders never need an effect to "fix" stale selection.
  const [userPickedTab, setUserPickedTab] = useState<string | null>(null)

  const activeTab: string | null =
    userPickedTab && tabKeys.includes(userPickedTab)
      ? userPickedTab
      : (tabKeys[0] ?? null)

  if (buildingData === null) {
    return null
  }

  const {
    name,
    image_url,
    primary_purpose,
    operating_hours,
    menu_tabs,
  } = buildingData

  const activeValue =
    activeTab && menu_tabs ? menu_tabs[activeTab] : undefined

  return (
    <aside
      className="fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col overflow-hidden bg-white p-6 shadow-lg"
      role="complementary"
      aria-label="Building details"
    >
      <div className="relative mb-4 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-md bg-white/90 text-base font-medium text-neutral-800 shadow-sm ring-1 ring-neutral-200 transition hover:bg-white"
          aria-label="Close panel"
        >
          X
        </button>
        {image_url ? (
          <img
            src={image_url}
            alt={name ?? 'Building'}
            className="aspect-4/3 w-full rounded-lg object-cover"
          />
        ) : (
          <div className="aspect-4/3 w-full rounded-lg bg-neutral-200" />
        )}
      </div>

      <header className="shrink-0">
        <h2 className="text-xl font-semibold text-neutral-900">
          {name ?? 'Unnamed building'}
        </h2>
        {primary_purpose && (
          <p className="mt-1 text-sm text-neutral-600">{primary_purpose}</p>
        )}
        {operating_hours && (
          <p className="mt-1 text-xs uppercase tracking-wide text-neutral-500">
            {operating_hours}
          </p>
        )}
      </header>

      {tabKeys.length > 0 && (
        <nav
          className="mt-4 flex shrink-0 gap-2 overflow-x-auto border-b border-neutral-200 pb-2"
          aria-label="Building sections"
        >
          {tabKeys.map((key) => {
            const isActive = key === activeTab
            return (
              <button
                key={key}
                type="button"
                onClick={() => setUserPickedTab(key)}
                aria-pressed={isActive}
                className={
                  'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ' +
                  (isActive
                    ? 'bg-neutral-900 text-white'
                    : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200')
                }
              >
                {key}
              </button>
            )
          })}
        </nav>
      )}

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <TabBody value={activeValue} />
      </div>
    </aside>
  )
}

/**
 * Render the value of the currently selected `menu_tabs` entry.
 * - `string`         → paragraph
 * - `string[]`       → bullet list
 * - `null`/missing   → nothing (caller controls empty-state messaging)
 */
function TabBody({ value }: { value: string | string[] | undefined }) {
  if (value === undefined) {
    return (
      <p className="text-sm italic text-neutral-500">
        No content for this section yet.
      </p>
    )
  }

  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-800">
        {value.map((item, i) => (
          <li key={`${item}-${i}`}>{item}</li>
        ))}
      </ul>
    )
  }

  return (
    <p className="text-sm leading-relaxed text-neutral-700">{value}</p>
  )
}
