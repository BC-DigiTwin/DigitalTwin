import React, { useEffect, useId, useState } from 'react'
import { Leva, LevaPanel, levaStore } from 'leva'
import { useStore } from '../store/useStore'

/** Drawer width — keep in sync with `aside` width class below. */
const DRAWER_WIDTH_CLASS = 'w-[min(22rem,92vw)]'

interface DebugWrapperProps {
  children: React.ReactNode
}

/**
 * DebugWrapper anchors Leva scene controls and hosts the scene-options drawer.
 *
 * Features:
 * - Fixed top-left menu control; fades out while the drawer is open so it never covers the panel
 * - Drawer: slide + scale from the left (origin-left) with a short content fade-in stagger
 * - No modal overlay: scene stays fully visible and interactive while the
 *   drawer is open so Leva tweaks can be judged in place; close via Escape,
 *   the drawer Close button, or the trigger when it is visible again
 * - Toggle for the r3f-perf stats overlay (bottom-left when on)
 * - Drawer / menu z-index stays below 10000 so Leva’s portaled color picker
 *   (inline z-index 10000) and overlay remain usable
 *
 * @example
 * ```tsx
 * <DebugWrapper>
 *   <Canvas>
 *     // Your 3D scene content
 *   </Canvas>
 * </DebugWrapper>
 * ```
 */
export function DebugWrapper({ children }: DebugWrapperProps) {
  const showPerfOverlay = useStore((s) => s.showPerfOverlay)
  const setShowPerfOverlay = useStore((s) => s.setShowPerfOverlay)
  const [sceneOptionsOpen, setSceneOptionsOpen] = useState(false)
  const drawerVisible = sceneOptionsOpen
  const drawerTitleId = useId()

  useEffect(() => {
    if (!drawerVisible) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSceneOptionsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [drawerVisible])

  return (
    <>
      {children}

      {/*
        Always mount a hidden root Leva so the library does not leave a stray
        floating panel on `document.body` from `useControls`'s auto-root.
        The visible UI is `LevaPanel` inside the drawer.
      */}
      <Leva hidden />

      <button
        type="button"
        className={`fixed left-3 top-3 z-9010 flex h-11 w-11 items-center justify-center rounded-lg bg-neutral-900/90 text-neutral-100 shadow-md ring-1 ring-white/10 transition-[opacity,transform,box-shadow] duration-200 ease-out will-change-[opacity,transform] hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 ${
          drawerVisible
            ? 'pointer-events-none scale-95 opacity-0'
            : 'pointer-events-auto scale-100 opacity-100'
        }`}
        onClick={() => setSceneOptionsOpen((o) => !o)}
        aria-expanded={drawerVisible}
        aria-controls="scene-options-drawer"
        aria-label={drawerVisible ? 'Close scene options' : 'Open scene options'}
      >
        <span className="sr-only">Scene options</span>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          {drawerVisible ? (
            <>
              <path d="M6 6l12 12M18 6L6 18" />
            </>
          ) : (
            <>
              <path d="M4 7h16M4 12h16M4 17h16" />
            </>
          )}
        </svg>
      </button>

      <aside
        id="scene-options-drawer"
        data-testid="scene-options-drawer"
        data-open={drawerVisible}
        className={`fixed left-0 top-0 z-9000 flex h-full flex-col bg-neutral-950/97 py-3 shadow-2xl shadow-black/50 ring-1 ring-white/10 ${DRAWER_WIDTH_CLASS} origin-left transition-transform duration-520 ease-[cubic-bezier(0.22,1,0.36,1.06)] will-change-transform motion-reduce:transition-none motion-reduce:duration-0 ${
          drawerVisible
            ? 'translate-x-0 scale-100 pointer-events-auto'
            : '-translate-x-full scale-[0.88] pointer-events-none'
        }`}
        role="dialog"
        aria-modal={drawerVisible}
        aria-hidden={!drawerVisible}
        aria-labelledby={drawerTitleId}
        inert={!drawerVisible ? true : undefined}
      >
        <div
          className={`flex min-h-0 flex-1 flex-col transition-opacity duration-200 ease-out motion-reduce:transition-none ${
            drawerVisible
              ? 'opacity-100 delay-100 motion-reduce:delay-0'
              : 'opacity-0 delay-0'
          }`}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 pb-3">
            <h2
              id={drawerTitleId}
              className="text-sm font-semibold tracking-wide text-neutral-100"
            >
              Scene options
            </h2>
            <button
              type="button"
              onClick={() => setSceneOptionsOpen(false)}
              className="rounded-md px-2 py-1 text-xs font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              Close
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-1 pt-2">
            <LevaPanel
              store={levaStore}
              fill
              flat
              titleBar={{
                drag: false,
                filter: true,
                title: undefined,
              }}
            />
          </div>

          <div className="shrink-0 border-t border-white/10 px-3 pt-3">
            <label className="flex cursor-pointer select-none items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-neutral-200 hover:bg-white/10">
              <input
                type="checkbox"
                className="size-4 rounded border-neutral-500 bg-neutral-900 text-sky-500 focus:ring-sky-400"
                checked={showPerfOverlay}
                onChange={(e) => setShowPerfOverlay(e.target.checked)}
              />
              <span>Show performance stats (bottom-left)</span>
            </label>
          </div>
        </div>
      </aside>
    </>
  )
}
