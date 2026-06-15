import * as THREE from 'three'
import {
  WAYPOINT_CATEGORY_META,
  type WaypointCategory,
} from '../../lib/mockWaypoints'

/**
 * Sprite-ready canvas textures for waypoint category icons.
 *
 * Each texture is a 128×128 transparent canvas containing:
 *   1. A semi-opaque dark disk backing (for contrast against any background).
 *   2. A 6px ring in the category color (echoes the ground ring colour).
 *   3. A vector glyph drawn in the category color (filled / stroked).
 *
 * Textures are cached per `(category, scale)` pair so re-renders don't
 * re-allocate canvas elements or trigger GPU re-uploads.
 */

const CANVAS_PX = 128
const RING_WIDTH = 6
const BG_ALPHA = 0.62

type CacheKey = `${WaypointCategory}::${number}`
const cache = new Map<CacheKey, THREE.CanvasTexture>()

/**
 * Get (or create) the canvas texture for the given category. `scale` is a
 * 0–1 multiplier on icon intensity — pass `1` for the default lit look and
 * lower values to dim the icon e.g. when filtered out (currently unused;
 * reserved for future hover-foreground states).
 */
export function getWaypointIconTexture(
  category: WaypointCategory,
  scale: number = 1,
): THREE.CanvasTexture {
  const key: CacheKey = `${category}::${roundScale(scale)}`
  const cached = cache.get(key)
  if (cached) return cached

  const tex = buildIconTexture(category, roundScale(scale))
  cache.set(key, tex)
  return tex
}

function roundScale(scale: number): number {
  return Math.round(Math.min(1, Math.max(0, scale)) * 100) / 100
}

function buildIconTexture(
  category: WaypointCategory,
  scale: number,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_PX
  canvas.height = CANVAS_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return new THREE.CanvasTexture(canvas)
  }

  const color = WAYPOINT_CATEGORY_META[category].color
  const cx = CANVAS_PX / 2
  const cy = CANVAS_PX / 2
  const r = CANVAS_PX / 2 - RING_WIDTH

  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(8, 14, 22, ${BG_ALPHA})`
  ctx.fill()

  ctx.lineWidth = RING_WIDTH
  ctx.strokeStyle = color
  ctx.globalAlpha = scale
  ctx.stroke()

  ctx.fillStyle = color
  ctx.strokeStyle = color
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  drawCategoryGlyph(ctx, category, cx, cy)

  ctx.globalAlpha = 1

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  tex.needsUpdate = true
  return tex
}

function drawCategoryGlyph(
  ctx: CanvasRenderingContext2D,
  category: WaypointCategory,
  cx: number,
  cy: number,
): void {
  switch (category) {
    case 'entrance':
      drawEntranceGlyph(ctx, cx, cy)
      return
    case 'stairs':
      drawStairsGlyph(ctx, cx, cy)
      return
    case 'bathroom':
      drawBathroomGlyph(ctx, cx, cy)
      return
  }
}

/** Door + arrow. Suggests "way in". */
function drawEntranceGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  const w = 24
  const h = 40
  const doorX = cx - 6
  const doorY = cy - h / 2

  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(doorX, doorY + h)
  ctx.lineTo(doorX, doorY)
  ctx.lineTo(doorX + w, doorY)
  ctx.lineTo(doorX + w, doorY + h)
  ctx.stroke()

  const arrowY = cy
  const arrowHeadX = doorX + 4
  ctx.beginPath()
  ctx.moveTo(doorX - 20, arrowY)
  ctx.lineTo(arrowHeadX, arrowY)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(arrowHeadX, arrowY)
  ctx.lineTo(arrowHeadX - 10, arrowY - 8)
  ctx.lineTo(arrowHeadX - 10, arrowY + 8)
  ctx.closePath()
  ctx.fill()
}

/** Three ascending steps. */
function drawStairsGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  const step = 12
  const baseY = cy + 18
  const leftX = cx - 24

  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(leftX, baseY)
  ctx.lineTo(leftX, baseY - step)
  ctx.lineTo(leftX + step, baseY - step)
  ctx.lineTo(leftX + step, baseY - step * 2)
  ctx.lineTo(leftX + step * 2, baseY - step * 2)
  ctx.lineTo(leftX + step * 2, baseY - step * 3)
  ctx.lineTo(leftX + step * 3, baseY - step * 3)
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(leftX, baseY)
  ctx.lineTo(leftX + step * 3, baseY)
  ctx.stroke()
}

/**
 * Universal restroom silhouette: round head + trapezoidal body, sized to fit
 * the 128 px tile. Avoids the cross-platform font / emoji rendering issues
 * that come with `fillText('WC')` or similar glyph shortcuts.
 */
function drawBathroomGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  const headRadius = 9
  const headY = cy - 18

  ctx.beginPath()
  ctx.arc(cx, headY, headRadius, 0, Math.PI * 2)
  ctx.fill()

  const shoulderY = headY + headRadius + 4
  const hipY = cy + 18
  const shoulderHalfWidth = 14
  const hipHalfWidth = 9

  ctx.beginPath()
  ctx.moveTo(cx - shoulderHalfWidth, shoulderY)
  ctx.quadraticCurveTo(
    cx - shoulderHalfWidth + 2,
    shoulderY - 4,
    cx - shoulderHalfWidth + 6,
    shoulderY - 4,
  )
  ctx.lineTo(cx + shoulderHalfWidth - 6, shoulderY - 4)
  ctx.quadraticCurveTo(
    cx + shoulderHalfWidth - 2,
    shoulderY - 4,
    cx + shoulderHalfWidth,
    shoulderY,
  )
  ctx.lineTo(cx + hipHalfWidth, hipY)
  ctx.lineTo(cx - hipHalfWidth, hipY)
  ctx.closePath()
  ctx.fill()
}

/** Free a single texture (test cleanup). */
export function disposeWaypointIconCache(): void {
  for (const tex of cache.values()) {
    tex.dispose()
  }
  cache.clear()
}
