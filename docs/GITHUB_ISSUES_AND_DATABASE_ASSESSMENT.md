# GitHub Issues & Database vs S3 – Assessment

**Date:** March 2, 2026  
**Scope:** Open issues on BC-DigiTwin/DigitalTwin vs current local codebase; database vs S3 pivot. Issue data and dependency/grouping section below are from GitHub (list_issues, open state).

---

## 1. Do the issues still make logical sense given the current code?

**Short answer:** Partly. Many issues are **forward-looking** (they describe work that isn’t in the repo yet). A few are **outdated or inconsistent** with the current architecture.

### What the codebase actually has today

| Area | Current state |
|------|----------------|
| **Frontend store** | Zustand with `layers` (visibility), `appState`, `debugMode` only. **No** `selectedEntity`, `setSelectedId`, `setHoveredId`, hierarchy, or location state. |
| **API** | `backend/server.js`: only `/api/health` and `/api/buildings`. **No** `/api/locations/:id`, **no** `/api/hierarchy`. `LocationController` and `LocationService` exist but are **not mounted** in `server.js`. |
| **Routes** | Root `routes/*.js` (locations, buildings, floors, rooms) are **stubs** (TODOs, return empty data). They reference `/api/v1/...` and are not used by `backend/server.js`. |
| **Database** | Single `locations` table (migration exists). Backend uses **MySQL** directly (no Prisma). Schema has `model_url`, `texture_url`, `thumbnail_url` (S3 paths). |
| **3D / Blender** | `BuildingsGroup` loads and renders `/models/campus_greybox.glb` at World Origin (`gpsToWorldPosition` + `WORLD_ORIGIN`); issue #63 implemented. `useAssetLoader` supports Draco (CDN). No S3 URLs yet. No pointer events, no highlight shaders, no interaction layer. |
| **UI** | No Info Panel, no overlay layout, no React Query. |

So: issues that assume “Info Panel”, “selectedEntity”, “React Query”, “GET /api/hierarchy”, “GET /api/locations/:id” are **consistent with a planned design** but **not with the current implementation**. They still make sense as a roadmap.

---

## 2. Which issues are outdated or conflict with the Blender integration plan?

### Likely outdated or conflicting

- **README says “Prisma”** but there is **no Prisma** in the repo (no `schema.prisma`, no Prisma client). Any issue that says “use Prisma” or “Prisma migrations” is **outdated**; the codebase uses raw MySQL + SQL migrations.
- **Backend server** uses `SELECT * FROM buildings` in `/api/buildings`, but the **only** migration defines a **`locations`** table (no `buildings` table). So either the migration wasn’t applied as the main schema, or there’s a mismatch. Issues that assume a separate `buildings` table conflict with the single recursive `locations` schema.
- **Duplicate / overlapping issues:** There are two “Raycaster Setup” issues (92 and 93) and two “Zustand Setup” (76 and 77), and two “Pointer Events: Bind onPointerOver…” (99 and 113). Worth consolidating or closing duplicates.

### Aligned with Blender integration (still valid)

- **#117 (PR) – 50 greybox modeling:** Matches current Blender → greybox workflow.
- **#63 – Integration: Import greybox .glb into `<BuildingsGroup />`:** **Implemented in repo.** Greybox GLB is loaded and rendered under `BuildingsGroup` with World Origin positioning (`gpsToWorldPosition` + `WORLD_ORIGIN`); placeholder boxes removed.
- **#62 – Draco Decoder Setup:** Already done in `useAssetLoader.ts` (CDN). Could be closed or marked “verify only.”
- **#55 – Export Pipeline (.glb, Draco):** Matches README and Blender workflow.
- **#54 – Viewer Validation:** Still valid pre-export step.
- **#53 – Material Assigning (color-coded):** Fits Blender workflow.
- **#52 – Hierarchy Cleanup (Blender outliner):** Fits scene-graph / export plan.
- **#51 – Origin Management:** Matches “World Origin” and GPS anchor; still relevant.
- **#50 – Greybox Modeling:** Core Blender task; still valid.

Issues about **pointer events, rim light shader, interaction wrapper, layers, raycasting** are **not conflicting** with Blender integration; they’re the next step after models are in the scene (and some depend on the interaction/store design that isn’t built yet).

---

## 3. Missing context for issues that are still valid

For someone picking up an issue and implementing it, the following context is missing or would help:

| Issue area | Missing / helpful context |
|------------|---------------------------|
| **Location API** | Backend has `LocationController` + `LocationService` but they are **not** registered in `backend/server.js`. Issues that say “call GET /api/locations/:id” or “GET /api/hierarchy” should state: “Mount the existing LocationController routes in `backend/server.js`” (and whether to use `/api/` or `/api/v1/`). |
| **Store (selectedEntity, hierarchy)** | Issues refer to `selectedEntity`, `setSelectedId`, `setHoveredId`. The store today has no such fields. Add: “Extend `src/store/useStore.ts` with `selectedEntity: string \| null`, `setSelectedEntity(id \| null)`, and optionally `hoveredEntity`,” and point to the existing `AppState`/`AppActions` pattern. |
| **React Query** | No `@tanstack/react-query` in the repo. Issues that say “use React Query” or “useBuildingMetadata(id)” need: “Install `@tanstack/react-query`, add a provider, then implement the hook that calls `/api/locations/:id`.” |
| **Info Panel / Overlay** | No overlay or Info Panel exists. Issues should clarify: overlay is a new DOM tree (e.g. absolutely positioned, `pointer-events: none` on container, `pointer-events: auto` on panel/buttons); Info Panel is a new component that subscribes to `selectedEntity` and shows loading/error/content. |
| **Blender → Web** | Add a short “Blender integration plan” to the repo: (1) Model in Blender (greybox/hero), (2) Set origin and hierarchy, (3) Export .glb (optionally Draco), (4) Validate in viewer, (5) Put file in `public/models/` or upload to S3 and use URL in `useGLTF`/`useAssetLoader`. That way “integrate Blender models” issues have a single reference. |
| **Database vs S3** | Many issues don’t mention the pivot. Add to relevant issues: “Metadata and hierarchy live in the DB (`locations` table); asset files (e.g. .glb) live in S3. The API returns `model_url` (S3) and the frontend loads from that URL.” |

---

## 4. Database vs S3: Is “no huge need for a relational DB” valid?

**Conclusion:** **Storing large asset files in S3 is correct.** Saying “we don’t need a relational database **at all**” is **not** valid if you want hierarchy, metadata, and navigation.

### What S3 is good for (and sufficient for)

- Storing and serving **large files**: .glb, textures, thumbnails.
- No need for a relational DB for **file bytes**; S3 + CloudFront is the right place.

### What a relational DB is still needed for (with current product goals)

- **Hierarchy:** Campus → Building → Floor → Room. Your migration and `LocationService.getHierarchy()` use a **recursive CTE** over `locations`. You can’t do that in S3 (it’s key–value, no relations).
- **Metadata:** Name, description, floor_number, room_number, area_sqft, is_navigable, is_visible, display_order. Querying “all rooms in building X” or “all buildings” is a DB job.
- **References to assets:** The schema already has `model_url`, `texture_url`, `thumbnail_url` (S3 paths). The DB holds **pointers** to S3 objects; it doesn’t store the files.
- **Transform and navigation:** position/rotation/scale, is_navigable, etc., are small structured data that belong in a DB so the frontend can fetch “one location” or “tree for this campus” without parsing GLB metadata.

So the **valid** conclusion is: “We store **large asset files** in S3; we do **not** store .glb bytes or big binaries in the database.” The **invalid** conclusion would be: “We don’t need a relational database”; you still need it for the **locations** hierarchy and metadata, unless you drop those features (e.g. no per-room/building metadata, no tree API).

### Recommendation

- **Keep** the `locations` table and the existing migration.
- **Use** the DB for: hierarchy, metadata, and S3 URL fields.
- **Use** S3 (and optionally CloudFront) for: serving .glb and other large assets.
- Update **docs/README** so the “database vs S3” pivot is explicit: “Relational DB for location hierarchy and metadata; S3 for asset files.”

---

## 5. Summary table: open issues vs current code (March 2026)

*Open on GitHub as of March 2026: #2, #47, #86, #87–#113. Issues #50–#79 are closed; table below kept for full reference; §6 adds dependencies and groupings.*

| Issue # | Title (short) | Still makes sense? | Notes |
|--------:|---------------|--------------------|--------|
| 118 | API routes and services for locations (PR) | Yes | Implements what’s missing in server.js; merge would connect LocationController. |
| 117 | 50 greybox modeling (PR) | Yes | Aligns with Blender integration. |
| 113 | Pointer Events (onPointerOver/Out, uIntensity) | Yes | Depends on interactive layer + materials; no conflict with Blender. |
| 112 | Close button → setSelectedEntity(null) | Yes | Blocked until store has selectedEntity and Info Panel exists. |
| 111 | Error handling 404 / “No Data Available” | Yes | Needs API + panel first. |
| 110 | Skeleton loader (React Query isLoading) | Yes | Needs React Query + panel. |
| 109 | Info Panel component | Yes | Core piece; add context above. |
| 108 | Layout Grid (HUD, sidebar) | Yes | No conflict. |
| 107 | Theme setup (CSS variables) | Yes | No conflict. |
| 106 | Animation (Framer Motion) | Yes | No conflict. |
| 105 | Mobile responsiveness | Yes | No conflict. |
| 104 | Interactive wrapper (pointer-events) | Yes | No conflict. |
| 103 | Overlay container | Yes | No conflict. |
| 102 | Cursor state on hover | Yes | No conflict. |
| 101 | Instancing support (shader) | Yes | For later performance. |
| 100 | Loading/Error states (store) | Yes | For hierarchy fetch. |
| 99 | Pointer Events (duplicate of 113?) | Duplicate | Prefer one. |
| 98 | Frame loop uTime | Yes | Shader animation. |
| 97 | Uniform setup (uColor, uIntensity, uTime) | Yes | Shader. |
| 96 | Rim light shader | Yes | Shader. |
| 95 | Event debouncing (click vs pan) | Yes | UX. |
| 94 | Hit testing debugger | Yes | Debug. |
| 93 | Raycaster setup | Duplicate? | Same as 92. |
| 92 | Raycaster setup | Yes | Restrict to interactive layer. |
| 91 | Layer configuration (bitmask) | Yes | Matches “Interactive” layer. |
| 90 | Interaction wrapper (onClick → store) | Yes | Needs store actions. |
| 89 | Store actions (setHoveredId, setSelectedId) | Yes | Not in store yet. |
| 79 | Endpoint GET /api/hierarchy | Yes | Backend has logic; not mounted. |
| 78 | Data hydration (useHydrateLocations) | Yes | Depends on API. |
| 77 | Zustand setup | Duplicate? | Same as 76. |
| 76 | Zustand setup | Yes | Store extension, not fresh init. |
| 75 | Derived state (selectors) | Yes | After store has location state. |
| 74 | Action implementation (setActiveLocation, etc.) | Yes | Same as 89. |
| 73 | Store definition (LocationNode, etc.) | Yes | TypeScript interface. |
| 72 | GET /api/hierarchy controller | Yes | Implemented; needs mounting. |
| 71 | Integration test (4-level hierarchy) | Yes | Backend test. |
| 70 | Type sharing (Zod → frontend) | Yes | Backend/frontend types. |
| 69 | Validation middleware (Zod) | Yes | Express. |
| 68 | Integration greybox into BuildingsGroup | Yes | Blender integration. |
| 63 | Integration greybox .glb, World Origin | Done in repo | Greybox rendered under BuildingsGroup; World Origin via gpsToWorldPosition + WORLD_ORIGIN. |
| 62 | Draco decoder setup | Mostly done | useAssetLoader has it; verify. |
| 58 | Fallback (red placeholder box) | Yes | Error UI. |
| 57 | Error Boundary (AssetErrorBoundary) | Yes | Error handling. |
| 55 | Export pipeline (.glb, Draco) | Yes | Blender. |
| 54 | Viewer validation | Yes | Blender. |
| 53 | Material assigning (Blender) | Yes | Blender. |
| 52 | Hierarchy cleanup (Blender outliner) | Yes | Blender. |
| 51 | Origin management (Blender) | Yes | Blender. |
| 50 | Greybox modeling | Yes | Blender. |
| 47 | Sprint 3 | Meta | Checklist checked; 50–79 closed. |
| 2 | Sprint 1 Planning | Meta | Done / historical. |

*Note: As of March 2026, GitHub shows #50–#79 and #71 as **closed**. The table above still lists them for reference; the **open** set is #2, #47, #86, #87–#113. See §6 for dependencies and same-person groupings.*

---

## 6. Issue dependencies and same-person groupings (Sprint 3 Week 2)

*Assign work so blockers are done first; where possible, related issues are done by the same person.*

### Blocking order (must complete before dependent issues)

| Do first | Before starting (dependent issues) |
|----------|-----------------------------------|
| **#87** Layer Configuration | **#88** Raycaster Setup (raycaster uses the layer from #87). |
| **#88** Raycaster Setup | **#90** Interaction Wrapper, **#91** Hit Testing debugger. |
| **#89** Store Actions (setHoveredId, setSelectedId) | **#90** Interaction Wrapper, **#107** selectedEntity selector, **#108** Info Panel, **#111** Close Action. |
| **#99** Overlay Container | **#100** Interactive Wrapper, **#101** Layout Grid, **#108** Info Panel (all live inside overlay). |
| **#105** Query Hook (useBuildingMetadata) | **#106** Query Keys, **#108** Info Panel (uses hook), **#109** Skeleton Loader, **#110** Error Handling. |
| **#107** selectedEntity selector | **#108** Info Panel (subscribes), **#111** Close Action. |
| **#108** Info Panel component | **#109** Skeleton Loader, **#110** Error Handling, **#111** Close Action. |

*Backend:* Location routes must be mounted in `server.js` (GET /api/hierarchy, GET /api/locations/:id) before **#105** (useBuildingMetadata) can be implemented.

### Best done by the same person (same pod / domain)

| Group | Issues | Reason |
|-------|--------|--------|
| **3D – Layers & interaction** | #87, #88, #90, #91, #92 | One developer: layers → raycaster → wrapper → hit debug → debounce. |
| **3D – Shaders & pointer feedback** | #93, #94, #95, #96, #97, #98 | One developer: rim light, uniforms, frame loop, pointer events, instancing, cursor. |
| **Cloud/UI – Overlay & layout** | #99, #100, #101, #102, #103, #104, #105, #106, #107 | One developer: overlay shell, interactive wrapper, layout grid, mobile, animation, theme, React Query hook/keys, selector. |
| **Cloud/UI – Info Panel** | #108, #109, #110, #111 | One developer: panel, skeleton, error state, close action. |

### Duplicates

- **#96 and #113:** Both "Pointer Events" (onPointerOver/Out, uIntensity). Prefer one; close the other.

---

**Bottom line**

- Issues are mostly **still logical**; many describe **not-yet-built** features. A few are **outdated** (Prisma, separate `buildings` table) or **duplicates** (Raycaster, Zustand, Pointer Events).
- **Blender integration** issues (50–55, 62–63, 68) align with the current plan; add a short “Blender → Web” doc and origin/S3 context.
- **Database:** Keep the relational DB for **locations** (hierarchy + metadata); use **S3 for large assets** only. The pivot is valid when stated that way; “no DB at all” would not be.

No code was changed; this is an assessment only.
