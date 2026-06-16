import { useEffect, useMemo, useRef, useState } from 'react'
import type { BuildingApiData } from '../../lib/mockDatabase'

export type { BuildingApiData }

type SidePanelProps = {
  buildingData: BuildingApiData | null
  onClose: () => void
}

/** Keep in sync with `digital-twin-panel-out` in `index.css` (+ buffer). */
const PANEL_EXIT_MS = 380

const DEFAULT_HERO_IMAGE =
  'https://twin-campus-assets.s3.us-east-2.amazonaws.com/default_hero.jpg'

function handleHeroImageError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.onerror = null
  e.currentTarget.src = DEFAULT_HERO_IMAGE
}

function isBlobUrl(src: string) {
  return src.startsWith('blob:')
}

/**
 * Download an image and report byte progress (0–1) when the server sends
 * `Content-Length`. Falls back to XHR, then a plain `<img>` load.
 */
async function loadImageWithProgress(
  url: string,
  onProgress: (progress: number) => void,
): Promise<string> {
  onProgress(0)

  try {
    return await fetchImageWithProgress(url, onProgress)
  } catch {
    try {
      return await xhrImageWithProgress(url, onProgress)
    } catch {
      return loadImageViaElement(url, onProgress)
    }
  }
}

async function fetchImageWithProgress(
  url: string,
  onProgress: (progress: number) => void,
): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`fetch failed: ${response.status}`)
  }

  const contentLength = response.headers.get('content-length')
  const total = contentLength ? Number.parseInt(contentLength, 10) : 0

  if (!response.body || !Number.isFinite(total) || total <= 0) {
    const blob = await response.blob()
    onProgress(1)
    return URL.createObjectURL(blob)
  }

  const reader = response.body.getReader()
  const chunks: BlobPart[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      chunks.push(value)
      loaded += value.length
      onProgress(Math.min(loaded / total, 0.99))
    }
  }

  const blob = new Blob(chunks, {
    type: response.headers.get('content-type') ?? 'image/jpeg',
  })
  onProgress(1)
  return URL.createObjectURL(blob)
}

function xhrImageWithProgress(
  url: string,
  onProgress: (progress: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.responseType = 'blob'
    xhr.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(event.loaded / event.total, 0.99))
      }
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1)
        resolve(URL.createObjectURL(xhr.response))
        return
      }
      reject(new Error(`xhr failed: ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('xhr network error'))
    xhr.send()
  })
}

/** Last resort when CORS blocks byte-level progress — bar creeps, then completes on load. */
function loadImageViaElement(
  url: string,
  onProgress: (progress: number) => void,
): Promise<string> {
  return new Promise((resolve) => {
    let creep = 0
    const tick = window.setInterval(() => {
      creep = Math.min(creep + 0.05, 0.9)
      onProgress(creep)
    }, 100)

    const img = new Image()
    img.onload = () => {
      window.clearInterval(tick)
      onProgress(1)
      resolve(url)
    }
    img.onerror = () => {
      window.clearInterval(tick)
      onProgress(1)
      resolve(DEFAULT_HERO_IMAGE)
    }
    img.src = url
  })
}

function BuildingHeroImage({
  buildingId,
  imageUrl,
  alt,
}: {
  buildingId: string
  imageUrl: string | null
  alt: string
}) {
  const blobUrlRef = useRef<string | null>(null)
  const [displaySrc, setDisplaySrc] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const src = imageUrl || DEFAULT_HERO_IMAGE
    let cancelled = false

    if (blobUrlRef.current && isBlobUrl(blobUrlRef.current)) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    setIsLoading(true)
    setProgress(0)

    void loadImageWithProgress(src, (value) => {
      if (!cancelled) setProgress(value)
    }).then((resolvedSrc) => {
      if (cancelled) {
        if (isBlobUrl(resolvedSrc)) URL.revokeObjectURL(resolvedSrc)
        return
      }
      if (isBlobUrl(resolvedSrc)) blobUrlRef.current = resolvedSrc
      setDisplaySrc(resolvedSrc)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [buildingId, imageUrl])

  useEffect(() => {
    return () => {
      if (blobUrlRef.current && isBlobUrl(blobUrlRef.current)) {
        URL.revokeObjectURL(blobUrlRef.current)
      }
    }
  }, [])

  const progressPercent = Math.round(progress * 100)

  return (
    <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
      {isLoading ? (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6"
          aria-live="polite"
          aria-busy="true"
          aria-label={`Loading building image, ${progressPercent} percent`}
        >
          <div className="w-full overflow-hidden rounded-full bg-white/15">
            <div
              className="h-1.5 rounded-full bg-white/85 transition-[width] duration-150 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums text-white/55">
            {progressPercent}%
          </span>
        </div>
      ) : (
        <img
          src={displaySrc}
          alt={alt}
          className="aspect-4/3 w-full object-cover"
          onError={handleHeroImageError}
        />
      )}
    </div>
  )
}

function slugForDomKey(label: string, index: number) {
  const base = label
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
  return base || `section-${index}`
}

/**
 * Building panel: header (image, title, meta) + vertical accordion sections
 * from `menu_tabs` keys. Sections start collapsed when a building is opened;
 * only one section is expanded at a time; clicking the open header collapses it.
 * Closing runs a short slide-out animation before `onClose` unmounts the panel.
 */
export function SidePanel({ buildingData, onClose }: SidePanelProps) {
  const tabKeys = useMemo<string[]>(
    () =>
      buildingData?.menu_tabs ? Object.keys(buildingData.menu_tabs) : [],
    [buildingData],
  )

  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [isClosing, setIsClosing] = useState(false)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!buildingData) return
    setExpandedKey(null)
    setIsClosing(false)
  }, [buildingData?.id])

  useEffect(() => {
    if (!isClosing) return
    const done = window.setTimeout(() => {
      onCloseRef.current()
      setIsClosing(false)
    }, PANEL_EXIT_MS)
    return () => window.clearTimeout(done)
  }, [isClosing])

  const beginClose = () => {
    if (isClosing) return
    setExpandedKey(null)
    setIsClosing(true)
  }

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

  const toggleSection = (key: string) => {
    setExpandedKey((prev) => (prev === key ? null : key))
  }

  return (
    <aside
      className={
        'digital-twin-side-panel fixed inset-y-0 right-0 z-50 flex h-full w-full max-w-md flex-col overflow-hidden border-l border-white/15 bg-neutral-950/55 p-6 shadow-2xl backdrop-blur-3xl backdrop-saturate-150 ' +
        (isClosing ? 'digital-twin-side-panel--exit pointer-events-none' : '')
      }
      role="complementary"
      aria-label="Building details"
      aria-busy={isClosing}
    >
      <div className="relative mb-4 shrink-0 transition-transform duration-500 ease-out">
        <button
          type="button"
          onClick={beginClose}
          disabled={isClosing}
          className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-md bg-white/15 text-base font-medium text-white shadow-sm ring-1 ring-white/25 transition duration-200 hover:scale-105 hover:bg-white/25 active:scale-95 disabled:pointer-events-none disabled:opacity-60"
          aria-label="Close panel"
        >
          X
        </button>
        <BuildingHeroImage
          buildingId={buildingData.id}
          imageUrl={image_url}
          alt={name ?? 'Building'}
        />
      </div>

      <header className="shrink-0 border-b border-white/10 pb-4 transition-opacity duration-300">
        <h2 className="text-xl font-semibold tracking-tight text-white">
          {name ?? 'Unnamed building'}
        </h2>
        {primary_purpose && (
          <p className="mt-1.5 text-sm leading-relaxed text-white/85">
            {primary_purpose}
          </p>
        )}
        {operating_hours && (
          <p className="mt-2 text-xs uppercase tracking-wide text-white/55">
            {operating_hours}
          </p>
        )}
      </header>

      {tabKeys.length > 0 ? (
        <nav
          className="mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1"
          aria-label="Building sections"
        >
          {tabKeys.map((key, index) => {
            const isOpen = key === expandedKey
            const panelId = `accordion-panel-${slugForDomKey(key, index)}`
            const triggerId = `accordion-trigger-${slugForDomKey(key, index)}`
            const value = menu_tabs ? menu_tabs[key] : undefined

            return (
              <section
                key={key}
                className="digital-twin-accordion-section shrink-0 overflow-hidden rounded-xl bg-white/6 ring-1 ring-white/10 transition-[box-shadow,background-color] duration-300 ease-out hover:bg-white/9 hover:ring-white/18"
                style={{
                  animation: `digital-twin-accordion-in 0.42s cubic-bezier(0.22, 1, 0.36, 1) ${index * 45}ms both`,
                }}
              >
                <h3 className="m-0 text-base font-semibold leading-none">
                  <button
                    id={triggerId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleSection(key)}
                    className="flex w-full items-center gap-3 px-3.5 py-3.5 text-left text-sm font-medium text-white transition-colors duration-200 hover:text-white"
                  >
                    <span className="min-w-0 flex-1 leading-snug">{key}</span>
                    <ChevronIcon
                      className={`h-5 w-5 shrink-0 text-white/70 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={triggerId}
                      className={`border-t border-white/10 px-3.5 pb-3.5 pt-1 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
                    >
                      <TabBody value={value} />
                    </div>
                  </div>
                </div>
              </section>
            )
          })}
        </nav>
      ) : (
        <div className="mt-4 flex min-h-0 flex-1 flex-col justify-center rounded-xl bg-white/4 p-6 ring-1 ring-white/10">
          <p className="text-center text-sm text-white/50">
            No sections for this building yet.
          </p>
        </div>
      )}
    </aside>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.24 4.5a.75.75 0 01-1.08 0l-4.24-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  )
}

/**
 * Render one `menu_tabs` value.
 * - `string`         → paragraph
 * - `string[]`       → bullet list
 * - `null`/missing   → empty-state line
 */
function TabBody({ value }: { value: string | string[] | undefined }) {
  if (value === undefined) {
    return (
      <p className="text-sm italic text-white/55">
        No content for this section yet.
      </p>
    )
  }

  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-white/90 marker:text-white/45">
        {value.map((item, i) => (
          <li key={`${item}-${i}`}>{item}</li>
        ))}
      </ul>
    )
  }

  return (
    <p className="text-sm leading-relaxed text-white/90">{value}</p>
  )
}
