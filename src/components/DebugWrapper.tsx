import React, { useEffect, useId, useState } from 'react'
import { Leva, LevaPanel, levaStore } from 'leva'
import { useStore } from '../store/useStore'

/** Drawer width — keep in sync with `aside` width class below. */
const DRAWER_WIDTH_CLASS = 'w-[min(22rem,92vw)]'

interface DebugWrapperProps {
  children: React.ReactNode
}

function isEditableKeyTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('input, textarea, select, [contenteditable="true"]') != null
  )
}

/**
 * DebugWrapper anchors Leva scene controls and hosts the scene-options drawer.
 *
 * Features:
 * - Toggle the drawer with the ` key (ignored while focus is in a text field)
 * - Drawer: slide + scale from the left (origin-left) with a short content fade-in stagger
 * - No modal overlay: scene stays fully visible and interactive while the
 *   drawer is open so Leva tweaks can be judged in place; close via `, Escape,
 *   or the drawer Close button
 * - Toggle for the r3f-perf stats overlay (top-left when on)
 * - Drawer z-index stays below 10000 so Leva’s portaled color picker
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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerVisible) {
        setSceneOptionsOpen(false)
        return
      }
      if (e.key !== '`' || isEditableKeyTarget(e.target)) return
      e.preventDefault()
      setSceneOptionsOpen((open) => !open)
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
              titleBar={false}
              oneLineLabels
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
              <span>Show performance stats (top-left)</span>
            </label>
          </div>
        </div>
      </aside>
    </>
  )
}
