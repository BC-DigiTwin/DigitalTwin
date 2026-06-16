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
    case 'accessibility':
      drawAccessibilityGlyph(ctx, cx, cy)
      return
    case 'elevator':
      drawElevatorGlyph(ctx, cx, cy)
      return
    case 'restroomAllGender':
    case 'restroomPublic':
      drawRestroomGlyph(ctx, cx, cy)
      return
    case 'emergencyPhone':
      drawEmergencyPhoneGlyph(ctx, cx, cy)
      return
    case 'parking':
      drawParkingGlyph(ctx, cx, cy)
      return
  }
}

/** Wheelchair stick figure — the international symbol of access. */
function drawAccessibilityGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  // Head
  ctx.beginPath()
  ctx.arc(cx - 2, cy - 26, 8, 0, Math.PI * 2)
  ctx.fill()

  ctx.lineWidth = 7
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'

  // Torso → seat → lower leg → footrest
  ctx.beginPath()
  ctx.moveTo(cx - 2, cy - 14)
  ctx.lineTo(cx - 2, cy + 4)
  ctx.lineTo(cx + 16, cy + 4)
  ctx.lineTo(cx + 22, cy + 22)
  ctx.stroke()

  // Arm to the wheel
  ctx.beginPath()
  ctx.moveTo(cx - 2, cy - 8)
  ctx.lineTo(cx + 14, cy - 4)
  ctx.stroke()

  // Wheel
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.arc(cx - 4, cy + 14, 18, 0, Math.PI * 2)
  ctx.stroke()
}

/** Telephone handset, angled like the classic phone pictogram. */
function drawEmergencyPhoneGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-Math.PI / 4)

  ctx.lineWidth = 11
  ctx.lineCap = 'round'

  // Handle bar
  ctx.beginPath()
  ctx.moveTo(0, -16)
  ctx.lineTo(0, 16)
  ctx.stroke()

  // Ear + mouth pieces
  ctx.beginPath()
  ctx.ellipse(0, -18, 10, 7, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(0, 18, 10, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

/** Boxed "P" — the universal parking pictogram. */
function drawParkingGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  ctx.lineWidth = 7
  ctx.lineJoin = 'round'
  ctx.beginPath()
  const x = cx - 26
  const y = cy - 30
  const w = 52
  const h = 60
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, 12)
  } else {
    ctx.rect(x, y, w, h)
  }
  ctx.stroke()

  ctx.font = "bold 52px 'Arial', 'Helvetica', sans-serif"
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('P', cx, cy + 3)
}

/** Up + down triangles — the standard elevator pictogram. */
function drawElevatorGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
): void {
  const half = 9
  const gap = 5

  // Up triangle (top).
  ctx.beginPath()
  ctx.moveTo(cx, cy - gap - 18)
  ctx.lineTo(cx - half, cy - gap)
  ctx.lineTo(cx + half, cy - gap)
  ctx.closePath()
  ctx.fill()

  // Down triangle (bottom).
  ctx.beginPath()
  ctx.moveTo(cx, cy + gap + 18)
  ctx.lineTo(cx - half, cy + gap)
  ctx.lineTo(cx + half, cy + gap)
  ctx.closePath()
  ctx.fill()
}

/**
 * Universal restroom silhouette: round head + trapezoidal body, sized to fit
 * the 128 px tile. Shared by both restroom categories — they're distinguished
 * by ring/icon color and panel label (mirroring the campus map legend, which
 * uses the same pictogram for "All Gender" and "Public"). Avoids the
 * cross-platform font / emoji rendering issues that come with `fillText('WC')`.
 */
function drawRestroomGlyph(
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
