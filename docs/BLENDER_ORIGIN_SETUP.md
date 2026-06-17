# Blender Origin Setup (Issue 51 – World Origin)

This doc describes how to align the Blender campus model’s origin with the app’s **World Origin** so that scene (0,0,0) and the .glb’s (0,0,0) match. The app’s World Origin is defined in `src/constants/coordinates.ts` (e.g. 47°35'00.6"N 122°08'57.5"W).

---

## What you need to do in Blender

### 1. Open the campus scene

- Open the Blender file that was used to create `campus_greybox.glb` (the one that matches the current buildings and layout).

### 2. Decide where World Origin is in your scene

- The app’s World Origin is **one real-world (lat, lon)**. You need to pick the **same point** in your Blender scene (e.g. center of the quad, corner of a building, or a known landmark).
- If your scene is already in meters and roughly geo-aligned, choose that spot and note it (e.g. “center of quad”).

### 3. Place the 3D Cursor at that point

- **Option A:** In the viewport, **Shift + Right‑click** where you want the origin (cursor moves there).
- **Option B:** Select a vertex/object at that spot → **Shift + S** → **Cursor to Selected**.
- **Option C:** **N** to open the sidebar → **Item** tab → under **3D Cursor**, set **X, Y, Z** to the coordinates of your World Origin point in the scene.

### 4. Add an Empty at the cursor

- **Shift + A** → **Empty** → **Plain Axes**.
- The Empty is created at the 3D Cursor (your World Origin point).
- In the Outliner, rename it (e.g. `WorldOrigin` or `CampusRoot`).

### 5. Parent all campus geometry to the Empty

- In the **Outliner**, select **every** object that is part of the campus (all building meshes/groups).
- **Ctrl + P** (or **Object** → **Parent**) → **Object**.
- Choose the Empty you created as the parent.
- Result: the Empty should be the **only top-level object** in the scene (or the only one you export); all buildings are its children.

### 6. Export as GLB

- Select the **Empty** (root).
- **File** → **Export** → **glTF 2.0 (.glb)**.
- **Include** → **Selected Objects** (so only the Empty and its children export), or use **Scene** if the Empty is the only root.
- Set **Y Up** (or whatever your pipeline uses; Three.js typically expects Y up).
- Export to **`public/models/campus_greybox.glb`** (back up the existing file first if you want to compare).

---

## After you re-export (in the repo)

1. **Regenerate the React component** from the new .glb:
   ```bash
   npx gltfjsx@6.5.3 public/models/campus_greybox.glb -o src/components/Campus.tsx --types
   ```

2. **Remove the temporary offset** in the app:
   - In **`src/App.tsx`**: change `<Campus position={CAMPUS_GREYBOX_ORIGIN_OFFSET} />` back to `<Campus />` (no position, so the model sits at scene (0,0,0)).
   - In **`src/constants/coordinates.ts`**: remove **`CAMPUS_GREYBOX_ORIGIN_OFFSET`** (and its comment), or leave it but stop using it.

3. **Verify:** Run the app and turn on **Environment** → **Axes (World Origin)**. The axes at (0,0,0) should sit at the same point you chose in Blender (e.g. center of quad).

---

## Summary

- **In Blender:** One Empty at World Origin, all campus objects parented to it, export that root as the .glb.
- **In the app:** After replacing the .glb and re-running gltfjsx, place the campus at (0,0,0) and remove the greybox origin offset so the model’s origin and the scene’s World Origin stay aligned.
