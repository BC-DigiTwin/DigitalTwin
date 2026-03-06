# What We’ve Accomplished and How It Fits the Direction

**Date:** March 2, 2026  
**Purpose:** Planning check — map completed work to the roadmap (e.g. [Roadmap – Google Docs](https://docs.google.com/document/d/1icT2Tj0TYQX61ZEUwnha_OgfHI69xuWfA-K5pQCM0vY/edit?usp=sharing)) and confirm we’re on track. No code changes. Issue list and dependencies in §5 are from GitHub (BC-DigiTwin/DigitalTwin).

**Issue #63 (Integration greybox .glb, World Origin) is implemented in the repo:** the campus greybox GLB is now rendered under `BuildingsGroup` via `useAssetLoader`; World Origin is handled with `gpsToWorldPosition(WORLD_ORIGIN.lat, WORLD_ORIGIN.lon)` so positioning follows the project's geospatial anchor. The standalone `Campus` component was removed; placeholder boxes in `BuildingsGroup` were removed in favour of the GLB.

---

## 1. What’s in the roadmap (from GitHub issues)

The open/closed issues are tied to **weekly goals** on the roadmap. From the issue bodies:

- **Sprint 1** (#2): 3D Team (Environment, Canvas, Tooling #3–#10; Camera Rig & Coordinate Systems #11–#19) and Cloud/UI Team (DevOps/Infra #20–#26; API Architecture & Schema #27–#33) — all marked **done**.
- **Sprint 3** (#47): 3D content & greyboxing (#48–#55), engine & scene graph (#56–#63), backend & data (#64–#70), frontend state & integration (#72–#79). **As of March 2026, these issues are closed on GitHub** (Sprint 3 checklist in #47 is fully checked).
- **Sprint 3 Week 2** (#86): Interaction and UI — **all open**. 3D: #87–#99 (layers, raycaster, store actions, interaction wrapper, shaders, pointer events). Cloud/UI: #100–#112 (overlay, layout, React Query, Info Panel, skeleton, close action). #96 and #113 are both "Pointer Events" (onPointerOver/Out, uIntensity)—prefer one and close the other as duplicate.

So the **direction** is: foundation (Sprint 1) → Blender integration + hierarchy API + scene/asset pipeline (Sprint 3) → interaction + overlay UI (Sprint 3 Week 2 and beyond).

---

## 2. What we’ve accomplished so far (evidence in the repo)

### Sprint 1 — fully reflected in code

| Roadmap area | Issues | What’s in the repo |
|--------------|--------|---------------------|
| **3D – Environment, canvas, tooling** | #3–#10 | React + Vite + TypeScript; R3F `<Canvas>`; `LightingGroup`, `EnvironmentGroup`, `StressTestGroup`; Leva controls; `DebugWrapper`; layer visibility in Zustand (`useStore`); `LoadingScreen` (drei `useProgress`). |
| **3D – Camera & coordinates** | #11–#19 | `CameraRig`, `CameraControlContext`, Leva camera controls; `gpsToVector3()` in `src/utils/gps.ts` with tests; geospatial anchor approach (README). |
| **Cloud/UI – DevOps & infra** | #20–#26 | Backend (Express, CORS, env); DB connection (MySQL in `backend/src/db/`); `/api/health` (and `/api/buildings`). |
| **Cloud/UI – API & schema** | #27–#33 | Single `locations` table migration (Campus → Building → Floor → Room); `LocationService` (create, findById, getHierarchy, getChildren); `LocationController` (GET by id, hierarchy, children, POST create). **Prisma is planned as the long‑term ORM, but the current implementation still uses raw MySQL queries.** |

So: **Sprint 1 is done** and the codebase matches it — canvas, camera, coordinates, backend skeleton, DB schema, and location business logic are in place.

### Sprint 3 — partially done

| Roadmap area | Done in issues | What’s in the repo |
|--------------|----------------|---------------------|
| **3D – Greybox & Blender** | #48, #49 checked | Campus greybox GLB is loaded from `public/models/campus_greybox.glb` and rendered under `BuildingsGroup` (see #63). #50–#55 (full Blender pipeline, origin, materials, export, viewer) still open. PR #117 “50 greybox modeling” aligns here. |
| **3D – Engine & scene graph** | #56, #59, #60, #61, **#63** checked | `useAssetLoader` (Draco CDN); `BuildingsGroup` loads and renders `campus_greybox.glb` at World Origin (`gpsToWorldPosition` + `WORLD_ORIGIN`); `Suspense` + `AssetErrorBoundary` around BuildingsGroup; placeholder boxes removed in favour of the GLB. #57, #58, #62 (Error Boundary, fallback box, Draco verify) open. |
| **Cloud/UI – Backend & data** | #64, #65, #67 checked | Migration and DB connection in use; LocationController/Service exist. #68, #69, #70 (wire integration, validation middleware, type sharing) open. **Gap:** Location routes are **not** mounted in `backend/server.js`, so there is no `GET /api/lierarchy` or `GET /api/locations/:id` yet. |
| **Cloud/UI – Frontend state** | All open (#72–#79) | Store has **no** location state (no `selectedEntity`, `setSelectedId`, hierarchy, or `useHydrateLocations`). No React Query, no API client for hierarchy. |

So: **Sprint 3 is in progress.** Blender-side: greybox is in the app under BuildingsGroup with World Origin handling (issue #63 implemented); Blender pipeline (export, origin, materials) and Draco verification (#62) are the next steps. Backend-side: logic exists but routes aren’t exposed. Frontend-side: location store and data hydration are not started.

### Not yet started (Sprint 3 Week 2 and beyond)

- Overlay layout, Info Panel, React Query, skeleton loader.
- Interaction: raycasting, layers, pointer events, highlight shaders, “click building → show panel.”
- Store extension: `setSelectedEntity`, `setHoveredId`, selectors, loading/error state for hierarchy.

---

## 3. How this fits the direction we’re headed

- **Direction (from roadmap + issues):** Web-based digital twin → Blender models in the scene → users click buildings → overlay shows metadata from API → hierarchy/metadata from DB, assets from S3.
- **What we’ve accomplished:** We have the **foundation** (Sprint 1) and the **start of Sprint 3**: 3D scene with a greybox, camera, coordinates, backend with location logic and DB schema, and asset loader. No location API in the running server yet, no location state or overlay in the frontend.
- **How it makes sense:**  
  - The work done **matches** the first part of the roadmap (weekly goals → issues #2–#33 and the checked items in #47).  
  - It **sets up** the next steps: Blender integration (finish #50–#55, #62, #68; #63 greybox-in-BuildingsGroup is done), then **wire the API** (mount LocationController, then #72–#79), then **overlay + interaction** (Sprint 3 Week 2).  
  - One **pivot** is documented: DB for hierarchy/metadata, S3 for large assets (see `GITHUB_ISSUES_AND_DATABASE_ASSESSMENT.md`). That doesn’t conflict with what’s built; the schema already has S3 URL fields.

So we **are** on the right track: foundation is solid, Blender integration is the current focus, and the open issues correctly describe the next steps (API wiring, store extension, overlay, interaction). The main gaps are (1) mounting location routes in `server.js`, (2) extending the store for location/selection, and (3) finishing the Blender → web pipeline and optionally moving assets to S3.

---

## 4. Quick reference: “Am I on track?”

| If the roadmap says… | We’re on track because… |
|----------------------|--------------------------|
| Sprint 1: Canvas, camera, coordinates, backend, DB schema | All present in code; issues #3–#33 done. |
| Sprint 3: Get Blender models into the app | Greybox GLB is rendered under BuildingsGroup at World Origin (#63 done); useAssetLoader and BuildingsGroup in place; open issues (#50–#55, #62, #68) define the rest. |
| Sprint 3: Hierarchy API and frontend state | LocationController/Service and migration exist; we need to mount routes and add location state to the store (issues #72–#79). |
| Later: Click building → Info Panel, metadata | Not built yet; issues (#89–#112, etc.) describe overlay, store actions, React Query, panel. Order of work in the roadmap still makes sense. |

---

## 5. Issue dependencies and same-person groupings (Sprint 3 Week 2)

*Use this when assigning work: some issues must be done in order; others are best done by the same person.*

### Blocking order (must complete before dependent issues)

| Do first | Before starting |
|----------|------------------|
| **#87** Layer Configuration (bitmask layers) | **#88** Raycaster Setup — raycaster must restrict to the layer defined in #87. |
| **#88** Raycaster Setup | **#90** Interaction Wrapper (onClick → store), **#91** Hit Testing debugger — both need a working raycaster. |
| **#89** Store Actions (setHoveredId, setSelectedId) | **#90** Interaction Wrapper (dispatches to store), **#107** Zustand Selector (selectedEntity), **#108** Info Panel (subscribes to selectedEntity), **#111** Close Action (setSelectedEntity(null)). |
| **#103** Overlay Container | **#104** Interactive Wrapper (wrap panels), **#108** Layout Grid, **#109** Info Panel — overlay is the root for all UI. |
| **#105** Query Hook (useBuildingMetadata) | **#106** Query Keys, **#109** Info Panel (fetches by id), **#110** Skeleton Loader, **#111** Error Handling — panel needs the hook. |
| **#107** selectedEntity selector | **#108** Info Panel (subscribes to selectedEntity), **#111** Close button. |
| **#109** Info Panel component | **#110** Skeleton Loader, **#111** Error Handling, **#112** Close Action — all are behaviors of the panel. |

### Best done by the same person (same pod / domain)

| Group | Issues | Reason |
|-------|--------|--------|
| **3D – Layers & interaction** | #87, #88, #90, #91, #92 | One developer: define layers → raycaster → wrapper → hit debug → debounce. |
| **3D – Shaders & pointer feedback** | #93, #94, #95, #96, #97, #98, #99 (or #113) | One developer: rim light, uniforms, frame loop, pointer events, instancing — all touch materials/shader. |
| **Cloud/UI – Overlay & layout** | #100, #102, #103, #104, #105, #106, #107, #108 | One developer: overlay, cursor, interactive wrapper, layout grid, React Query hook/keys, selector — single “UI shell” pass. |
| **Cloud/UI – Info Panel** | #109, #110, #111, #112 | One developer: panel component, skeleton, error state, close action — single component. |

### Duplicates to resolve

- **#96 and #113:** Both "Pointer Events" (onPointerOver/Out, uIntensity). Prefer one; close the other.

No code was changed; this is a planning and alignment summary only.
