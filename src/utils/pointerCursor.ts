/**
 * Sets the document cursor to indicate hover over an interactive 3D object.
 * Use in onPointerOver (true) and onPointerOut (false) for immediate feedback
 * before shader/GPU updates.
 */
export function setPointerCursor(isOver: boolean): void {
  document.body.style.cursor = isOver ? 'pointer' : 'auto'
}
