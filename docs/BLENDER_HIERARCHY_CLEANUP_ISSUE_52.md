# Blender Hierarchy Cleanup – Issue 52 (Step-by-Step Tutorial)

This tutorial walks you through **GitHub Issue 52: Hierarchy Cleanup (Blender outliner)**. It assumes you know very little about Blender and tells you exactly where to find every button and option.

**Your starting point:** The screenshot in the repo (e.g. `assets/Screenshot_2026-02-27_at_1.59.11_PM-07c35a89-637e-40e1-84ca-2c3cb3fb133e.png`): `campus_greybox.blend` in Blender, with the greybox campus in the viewport, the **Outliner** on the top-right (showing `Environment`, `buildings`, and `WorldOrigin`), and the **Properties** panel on the bottom-right with `WorldOrigin` selected. Open that image next to this doc if you want to compare.

**Goal:** Clean up the outliner so you have **one clear hierarchy** (e.g. `WorldOrigin` as root with each building as a direct child, no duplicate names, no confusing nested “building inside building” entries). That makes the scene graph and .glb export predictable for the app.

---

## What’s wrong in the current setup (from your screenshot)

- **`buildings` collection** has `building_a` … `building_e`, and **each of those has a child object with the same name** (e.g. `building_a` → child `building_a`). That’s redundant and confusing.
- **`WorldOrigin`** also has children `building_a` … `building_e`. So the same building names appear in two places (under `buildings` and under `WorldOrigin`).
- For a clean export we want: **one root** (e.g. `WorldOrigin`) and **one list of building objects** as its direct children, with no duplicate-name nesting.

---

## Part 1: Find the Outliner and understand it

1. **Where is the Outliner?**  
   Top-right of the Blender window. The header says **“Scene”** and **“ViewLayer”** and has a search/filter area. The list below shows **Environment**, **buildings**, **WorldOrigin**, etc.

2. **What do the icons mean?**
   - **Triangle (▶)** next to a name: click it to expand/collapse and see children.
   - **Eye icon:** visibility in the viewport (click to hide/show).
   - **Camera icon:** whether it’s rendered (usually leave as-is for now).
   - **Icon next to the object name** (in the Outliner). Style varies by Blender version; in some (e.g. Blender 5.x) you may see:
     - **Orange triangle:** Empty (no geometry; top-level wrapper).
     - **Green triangle:** Empty (no geometry; middle-level wrapper).
     - **Red circle / sphere:** **Mesh** (has 3D geometry — the actual building parts like wall, roof).
     - Other versions use a small triangle for mesh and an arrow-in-a-box for Empty.

3. **How to select something:**  
   **Left‑click** the name (e.g. `WorldOrigin`). It highlights in blue. Only one item can be the “active” selection at a time in the Outliner.

---

## Part 2: Decide the target hierarchy

We want:

- **Root:** One object (e.g. `WorldOrigin` Empty) at the top.
- **Children:** Exactly one object per building: `building_a`, `building_b`, `building_c`, `building_d`, `building_e` — each the **mesh** that actually has the geometry, with **no** duplicate “building_a inside building_a” nesting.

So we will:

1. Fix the “building inside building” duplicates (so each building name appears once and is the mesh).
2. Make sure all building objects are children of `WorldOrigin` (and remove them from being duplicated under `buildings` in a confusing way, or remove the duplicate hierarchy under `buildings`).
3. Leave a single, clean list under `WorldOrigin` for export.

---

## Part 3: Expand the hierarchy and see what you have

1. In the **Outliner**, find **`buildings`** (the collection).
2. Click the **small triangle (▶)** to the left of **`buildings`** so it expands and you see `building_a`, `building_b`, etc.
3. Click the triangle next to **`building_a`**. You’ll see another **`building_a`** nested inside. That’s the duplicate we want to clean up.
4. Do the same for **`building_b`** … **`building_e`** and note which one is the “outer” object and which is the “inner” (child). Usually the **inner** one holds the mesh and the outer might be an empty or container.

We need to end up with **one object per building** that has the mesh. Often the **child** is the mesh and the **parent** is just a wrapper; we’ll either remove the wrapper or make the mesh the only one with that name.

---

## Part 4: Identify which object has the mesh (for one building)

You need to tell which of the two `building_x` objects is the **Mesh** (has the geometry) and which is an **Empty** (no geometry). You do that in two places: the **Outliner** (icon) and the **Properties** panel (tabs).

1. In the Outliner, expand **`buildings`** → **`building_b`** (or `building_a`) so you see the **parent** and the **child** (or children) under it.
2. **Look at the icon next to each name in the Outliner** (to the left of the name, in the same row). Icon style can vary by Blender version:
   - **Empty** (no geometry): often an **arrow pointing down into a box** (empty cube outline), or in some versions a triangle — it’s the one that **has children** (nested objects under it) and no mesh data.
   - **Mesh** (has geometry): often a **small triangle or triangular grid** — it’s the one that holds the actual 3D geometry. There may be **several** mesh children under one Empty (e.g. `building_b`, `wall`, `roof`).
   If icons look similar, use the Properties panel (step 3–4) to be sure which is mesh and which is Empty.

3. **In the Properties panel (bottom-right):** With the **parent** selected (the Empty), you see the **Object Properties** tab (orange cube icon) and things like **Transform** (Location, Rotation, Scale). There is **no** “Mesh” tab or mesh data — because it’s an Empty. You will **not** see the word “Mesh” here.
4. Now **click the child** `building_b` in the Outliner (the one with the **triangle** icon). The Properties panel updates. Look at the **vertical row of tabs on the left** of the Properties panel. Besides the orange cube (Object Properties), you should see another tab with a **green inverted triangle** (or mesh-like icon). That tab is **“Object Data Properties”** — that’s where **mesh** data lives (vertex groups, UV maps, etc.). So: **if you see that green-triangle / Object Data Properties tab, this object is the mesh.** If you only have the orange cube and no green mesh tab, it’s not a mesh.

**Summary:** You don’t search for the word “Mesh” in the UI. You look at (1) the **Outliner icon** (mesh = geometry icon; Empty = container, sometimes similar-looking) and (2) the **Properties** panel — **Object Data Properties** tab (green triangle) = mesh object. When in doubt, click an object: if the Properties panel has that green “Object Data” / mesh tab, it’s a mesh; if it only has Object Properties (Transform, etc.) and no mesh tab, it’s an Empty. For unparenting, always select and unparent the **mesh** object(s), never the Empty (Part 5).

*(If you have the screenshot where the parent `building_b` is selected and outlined in orange in the viewport, that view shows the Empty selected; the child `building_b` directly under it in the Outliner — the one with the triangular icon — is the mesh. See e.g. `assets/Screenshot_2026-02-28_at_3.20.29_PM-247e7050-a8f8-48df-9287-72ebf983c180.png`.)*

---

## Part 5: Remove duplicate “building inside building” (one building at a time)

### Your file has three levels (important)

In your scene, each building has **three levels** in the Outliner (your Blender uses these icons):

| Level | Icon (your Blender) | What it is | Example |
|-------|---------------------|------------|---------|
| **1. Top** | **Orange triangle** | Empty (no geometry), was under WorldOrigin | `building_a` (orange) |
| **2. Middle** | **Green triangle** | Empty (no geometry), child of the orange one | `building_a` (green), under the orange |
| **3. Bottom** | **Red circle** | **Mesh** (actual geometry) | `wall`, `roof`, under the green one |

So the chain is: **orange Empty → green Empty → wall + roof (meshes)**. We want to remove both Empties and leave only the meshes (wall, roof) at the top level, then parent those to WorldOrigin.

### What you did vs what we need

- **What you did:** You unparented the **orange** Empty (e.g. `building_a`, `building_b`) from **WorldOrigin**. So in the Outliner, `building_a` and `building_b` are no longer listed under WorldOrigin — they “floated” to the `buildings` collection level. The **Relations** panel for the orange `building_a` now shows an empty Parent field. That’s correct for that link, but the **inner** chain is still there: orange → green → wall/roof.
- **What we need:** Unparent **from the orange Empty**, not from WorldOrigin. So we need to unparent the **green** Empty and the **wall** and **roof** meshes **from their parent** (the orange Empty for green, the green Empty for wall/roof). Then delete the green Empty, then the orange Empty, so only the meshes (wall, roof) remain. Then we parent those meshes (and the same for every building) to WorldOrigin.

So: **do not** select the orange Empty and unparent it from WorldOrigin (you already did that for a and b). **Do** select the **green** one and **wall** and **roof**, and unparent each **from its current parent** (green from orange, wall and roof from green). Use **Properties → Object Properties → Relations → Parent** and clear it there if Alt+P doesn’t work.

### Step-by-step for your hierarchy (orange → green → wall/roof)

Do this for **building_a**, then **building_b**, then the other buildings that have the same structure.

1. Expand **`buildings`** → **building_a** (orange) → **building_a** (green) so you see **wall** and **roof** (red circles).
2. **Unparent the green `building_a` from the orange one:**  
   Click the **green** **building_a** in the Outliner (the one under the orange). In **Properties** → **Object Properties** → **Relations**, check **Parent**. It should show the **orange** building_a. Click the **X** next to Parent (or set to None). The green building_a should move up in the list to the same level as the orange one (directly under `buildings`).
3. **Unparent `wall` from the green building_a:**  
   Click **wall** (red circle) in the Outliner. In **Relations**, **Parent** should show the **green** building_a. Clear it (X or None). Wall moves up.
4. **Unparent `roof` from the green building_a:**  
   Click **roof** (red circle). In **Relations**, clear **Parent** (was green building_a). Roof moves up.
5. **Delete the green Empty:**  
   The green **building_a** now has no children. Select it in the Outliner and press **X** → **Delete**.
6. **Delete the orange Empty:**  
   The orange **building_a** now has no children. Select it and press **X** → **Delete**. You’re left with **wall** and **roof** (and any other mesh that was under that building) at the same level as the `buildings` collection.
7. Repeat for **building_b** (unparent green from orange, unparent wall and roof from green, delete green Empty, delete orange Empty), then for **building_c**, **building_d**, **building_e** if they have the same structure.

After that, **parent all the remaining meshes** (and any other building roots you want to keep) **to WorldOrigin** (Part 6): select all those objects, then **last-click** WorldOrigin, then **Ctrl+P** → **Object**.

---

**Why “unparent” seemed to do nothing before:** Unparenting the **orange** Empty from WorldOrigin only broke the link **WorldOrigin → orange**. The links **orange → green** and **green → wall/roof** were never cleared, so the nesting under the orange Empty stayed the same. You have to clear the parent **on the child** (green, wall, roof) so that **their** Parent field in Relations no longer points to the orange or green Empty.

**Rule:** Unparent the **mesh** object(s) (red circle) and the **green** Empty from **their** parents (green from orange, wall/roof from green). Use **Properties → Relations → Parent** and clear it there if Alt+P doesn’t change anything. Then delete both Empties (green, then orange).

### Case A: One mesh child under the Empty (e.g. one child named `building_a`)

1. In the Outliner, expand **`buildings`** → **`building_a`** so you see the child **`building_a`**.
2. **Click the child** **`building_a`** (the one that has the **mesh icon** in the Outliner — the actual geometry) to select it. Do **not** select the parent Empty.
3. **Unparent** it so it’s no longer under the parent `building_a`, **but keep it in the same place in the scene:**
   - With the child selected, press **Alt + P**. A small menu appears.
   - **Do not** choose plain **“Clear Parent”** — that can move the building to a wrong location (Blender reinterprets the child’s local position as world position).
   - Instead choose **“Clear Parent and Keep Transform”** (or **“Clear and Keep Transformation”**, depending on your Blender version). That unparents the object but keeps its current world position, so the building stays where it is.
   - Or use the top menu: **Object** → **Parent** → **Clear Parent and Keep Transform** (or similar wording).
4. Now the mesh `building_a` is a direct child of the **Scene** (or the collection), still in the correct place, and the old “parent” `building_a` might be empty. Select that **old parent** (the one that’s now empty or has no mesh) in the Outliner.
5. **Delete** it: press **X** (or **Delete** key). In the small menu that appears, choose **Delete** (not “Only from collection”). So we’re left with **one** `building_a` that has the mesh.

**If you already used “Clear Parent” and the building jumped:** Press **Ctrl + Z** (Undo) to put it back, then unparent again using **Clear Parent and Keep Transform** as above.

Repeat the same steps for any other building that has only one mesh child.

### Case A2: Multiple mesh children under one Empty (e.g. `building_b` has `building_b`, `wall`, `roof`)

Some buildings have **several mesh objects** under one Empty (e.g. one named `building_b`, plus `wall`, plus `roof`). You need to unparent **each of those mesh objects** from the Empty, then delete the Empty.

1. In the Outliner, expand **`buildings`** → **`building_b`** (or whichever building). You’ll see the **parent** (the Empty — wrapper with no geometry) and under it several **children** with the **mesh icon** (e.g. `building_b`, `wall`, `roof`).
2. **Click the first mesh child** (e.g. the `building_b` that has the mesh icon — not the Empty above it). In the Properties panel you should see the **Object Data Properties** tab (green triangle) when this is selected.
3. **Alt + P** → **Clear Parent and Keep Transform**. That mesh is now at the same level as the Empty (no longer under it).
4. **Click the next mesh child** (e.g. `wall`) in the Outliner. **Alt + P** → **Clear Parent and Keep Transform**.
5. Repeat for every other mesh under that Empty (e.g. `roof`).
6. Now the Empty has no mesh children left. **Select the Empty** (the one that was the parent — it may now show as empty or with no geometry) and press **X** → **Delete**. You’re left with the mesh objects (e.g. `building_b`, `wall`, `roof`) at the same level, and the wrapper is gone.

Do the same for every building that has multiple meshes under one Empty.

---

### Troubleshooting: “I unparent (Alt+P → Clear and Keep Transform) but nothing changes”

If you’ve tried unparenting the mesh children (and the parent Empty) and the Outliner still looks the same, try the following.

**1. Check whether the unparent actually applied**

- Select the **mesh** object you unparented (e.g. the child `building_b`, or `wall`, or `roof`) in the Outliner.
- Open the **Properties** panel (bottom-right). Click the **Object Properties** tab (orange cube icon).
- Scroll down to the **Relations** (or **Parent**) section. It shows the current **Parent** of this object.
  - If it still shows **`building_b`** (or another object), the parent was **not** cleared — the operation didn’t apply.
  - If it shows **“—”** or **None** or is empty, the parent **was** cleared. In that case the hierarchy did change; the Outliner might just not be showing it clearly (see step 2).

**2. Make sure the Outliner is showing parent hierarchy**

- At the **top of the Outliner** there is a dropdown (it might say “View Layer”, “Scene”, “Blender File”, “Collections”, etc.).
- If it’s set to **“Blender File”** or a **collection-only** view, the list is grouped by collection or file structure, not by parent. So an unparented object can still appear in the same area and look like “nothing changed.”
- Switch the dropdown to **“View Layer”** (or **“Scene”**). In that mode, the list is driven by **parent–child** and collection. After a successful unparent, the mesh should appear at the **same indent level** as the Empty (e.g. directly under `buildings`), not nested under the Empty. So you should see the object “move up” one level in the list.

**3. Clear the parent from the Properties panel instead of Alt+P**

Sometimes the shortcut or menu doesn’t apply. Use the panel:

- Select the **mesh** object (the one you want to unparent) in the Outliner. Ensure only this object is selected (click it once; if others are selected, Shift+click them in the Outliner to deselect).
- In **Properties** → **Object Properties** (orange cube) → **Relations**, find the **Parent** field (it may show the parent object name or an eyedropper).
- Click the **X** next to the Parent field, or the small arrow and choose **Clear** / **None**, so the object has no parent. The object should stay in place; only the parent link is removed.
- Check the Outliner again (with **View Layer** mode): the mesh should now sit at the same level as the Empty, not under it.

**4. If the Parent field is missing or grayed out**

- Confirm you have the **object** selected (the mesh), not the collection or a bone. The Relations/Parent section only appears for objects.
- Try **Object** (top menu) → **Parent** → **Clear Parent and Keep Transform** once with only that object selected, then check Properties → Relations → Parent again.

After the parent is really cleared (Relations shows no parent), you can delete the Empty as in the steps above. The goal is that in **View Layer** the mesh objects sit alongside (or above) the Empty, not under it.

### Case B: Parent has the mesh, child is empty

1. Select the **child** (the inner `building_a`) in the Outliner.
2. Press **X** → **Delete** to remove it.
3. Keep the parent (the one with the mesh). Rename if needed (see “Rename objects” below).

After this part, under the **`buildings`** collection you should have **five objects**: `building_a`, `building_b`, `building_c`, `building_d`, `building_e`, each appearing **once**, with no “same name nested inside” structure.

---

## Part 6: Make WorldOrigin the single parent of all buildings

Right now `WorldOrigin` might already have children named building_a … building_e; those might be the same objects as in `buildings` (Blender can show the same object in a collection and under a parent) or duplicates. We want **all building meshes** to be **direct children of WorldOrigin** and no duplicate hierarchy.

1. In the **Outliner**, **collapse** **`WorldOrigin`** (click the triangle so you don’t see its children for a moment).
2. Click **`WorldOrigin`** to select it. It’s the root we’ll use for export.
3. Now we need every **building mesh** to be a child of `WorldOrigin`. Two ways:

**Option 1 – If buildings are only under `buildings` (not under WorldOrigin):**

1. Expand **`buildings`** again. You should see only five objects: `building_a` … `building_e`.
2. **Multi-select** all five: click **building_a**, then hold **Shift** and click **building_b**, **building_c**, **building_d**, **building_e**. All five should be highlighted.
3. With those five selected, **last-click** **`WorldOrigin`** so it’s the “active” object (outline or highlight shows it’s the parent target). So: buildings selected, then click WorldOrigin.
4. Parent to WorldOrigin: press **Ctrl + P** (or top menu **Object** → **Parent** → **Object**). Choose **Object** in the small menu. Now all five buildings are children of **WorldOrigin**.

**Option 2 – If WorldOrigin already has children and they’re duplicates of the ones in `buildings`:**

1. Expand **WorldOrigin**. If you see building_a … building_e under it, check whether those are **the same** as the ones under `buildings` (same object in two places) or different.
2. If they’re **the same** (one object, two places): we only need them under **WorldOrigin**. So in the **`buildings`** collection, **remove** those objects from the collection (don’t delete the object): right‑click the object in the Outliner → **Remove from Collection** (or uncheck the collection in the object’s properties). Then you’ll have buildings only under WorldOrigin.
3. If they’re **different** (duplicates): delete the duplicates under WorldOrigin (select each, **X** → Delete), then use **Option 1** to parent the real building meshes from `buildings` to WorldOrigin.

After this, **WorldOrigin** should have exactly five children: **building_a**, **building_b**, **building_c**, **building_d**, **building_e**, and those are the only building objects in the scene.

---

## Part 7: (Optional) Keep or remove the `buildings` collection

- **Keep for Blender only:** You can leave a **collection** named `buildings` and put the same building objects in it for organization (Blender allows an object to be in a collection and also parented to WorldOrigin). For **export**, we export **WorldOrigin** and its children; the collection is just for your outliner.
- **Remove from outliner view:** If you don’t want to see `buildings` at all, you can **remove** each building from the `buildings` collection (Right‑click object in Outliner → **Remove from Collection**), so they only appear under WorldOrigin. You can also delete the empty **`buildings`** collection: select the collection in the Outliner, then **X** → **Delete** (or right‑click → Delete Hierarchy), but only if nothing important is only in that collection.

Result: in the Outliner you see **WorldOrigin** as the root, and under it **building_a** … **building_e** with no duplicate names and no “building inside building” nesting.

---

## Part 8: Rename objects (if needed)

1. In the **Outliner**, **double‑click** the object name (e.g. `building_a`). The name becomes editable.
2. Type the new name and press **Enter**.
3. Use clear, unique names: `building_a`, `building_b`, etc., so the app and glTF export stay predictable.

---

## Part 9: Verify the hierarchy

1. **Collapse** everything in the Outliner, then expand only **WorldOrigin**.
2. You should see exactly **five** children: **building_a**, **building_b**, **building_c**, **building_d**, **building_e**.
3. Click each building and confirm in the **Properties** panel (Object Properties) that it has a **Mesh** (or the data you expect). No building should have a child with the same name.
4. Optional: **File** → **Export** → **glTF 2.0 (.glb)** → select **WorldOrigin** → **Include: Selected Objects** → export. Open the .glb in a viewer or in the app to confirm the hierarchy looks correct.

---

## Quick reference – where things are in Blender

| What you need | Where to find it |
|---------------|------------------|
| **Outliner** | Top-right area; header says “Scene” / “ViewLayer”. |
| **Properties panel** | Bottom-right; tabs on the left (Object = orange cube). |
| **Object menu** | Top menu bar: **Object** (parent, clear parent, delete). |
| **Select in Outliner** | Left-click the name. |
| **Expand/collapse** | Click the triangle (▶) left of the name. |
| **Multi-select** | Hold **Shift** and click each item. |
| **Parent (Ctrl + P)** | Outliner: select children, then last-click parent, then **Object** → **Parent** → **Object** or **Ctrl + P** → **Object**. |
| **Clear parent but keep position (Alt + P)** | Select child → **Alt + P** → **Clear Parent and Keep Transform** (do not use plain “Clear Parent” or the building may move). |
| **Delete** | Select in Outliner → **X** or **Delete** key → choose **Delete**. |
| **Rename** | In Outliner, double-click the name and type. |
| **Remove from collection** | Right-click object in Outliner → **Remove from Collection**. |

---

## Summary (Issue 52 done)

- **Before:** Duplicate names (e.g. `building_a` containing another `building_a`), buildings under both `buildings` and `WorldOrigin`.
- **After:** One root (**WorldOrigin**) with five direct children (**building_a** … **building_e**), each appearing once, with the mesh on that single object. No nested duplicate names. Clean outliner and clean export for the app.

If you’ve also done **Issue 51 (Origin / World Origin)**, your Blender scene has one Empty at World Origin and all campus geometry parented under it; this hierarchy cleanup makes that same structure clear and export-friendly.
