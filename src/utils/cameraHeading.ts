/**
 * Screen-space angle (radians) of world-north for the active camera.
 *
 * Written every frame by `CameraRig` and read by the HTML compass overlay via
 * its own `requestAnimationFrame` loop. Kept as a plain mutable singleton
 * (instead of Zustand state) so the per-frame heading updates never trigger
 * React re-renders — the compass mutates a DOM transform directly.
 *
 * Convention: `0` = north points straight up on screen; positive rotates the
 * north marker clockwise (matches CSS `rotate()`).
 */
export const cameraHeading = { current: 0 }
