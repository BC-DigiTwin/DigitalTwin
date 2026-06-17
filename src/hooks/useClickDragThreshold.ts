import { useRef, useCallback } from 'react'
import type { ThreeEvent } from '@react-three/fiber'

interface PointerSnapshot {
  x: number
  y: number
  time: number
}

interface Options {
  /** Max pixels the pointer may travel and still count as a click. */
  threshold?: number
  /** Max milliseconds between down and up for a click. */
  maxDuration?: number
}

/**
 * Returns R3F-compatible `onPointerDown` and `onClick` handlers that
 * distinguish a deliberate click from a camera-pan drag.
 *
 * On `pointerdown` the screen position is recorded.  On `click` the
 * distance moved is compared against `threshold` (default 4 px) and
 * the elapsed time against `maxDuration` (default 400 ms).  The
 * `callback` only fires when both checks pass.
 *
 * @example
 * ```tsx
 * const handlers = useClickDragThreshold((e) => {
 *   console.log('Building clicked:', e.object.name)
 * })
 *
 * <mesh {...handlers} />
 * ```
 */
export function useClickDragThreshold(
  callback: (event: ThreeEvent<MouseEvent>) => void,
  { threshold = 4, maxDuration = 400 }: Options = {},
) {
  const downRef = useRef<PointerSnapshot | null>(null)

  const onPointerDown = useCallback((e: ThreeEvent<PointerEvent>) => {
    downRef.current = {
      x: e.nativeEvent.clientX,
      y: e.nativeEvent.clientY,
      time: performance.now(),
    }
  }, [])

  const onClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      const snap = downRef.current
      if (!snap) return

      const dx = e.nativeEvent.clientX - snap.x
      const dy = e.nativeEvent.clientY - snap.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      const elapsed = performance.now() - snap.time

      if (dist <= threshold && elapsed <= maxDuration) {
        callback(e)
      }

      downRef.current = null
    },
    [callback, threshold, maxDuration],
  )

  return { onPointerDown, onClick } as const
}
