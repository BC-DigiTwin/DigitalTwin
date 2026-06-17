# Node, nvm, and package-lock Team Guide

This guide covers how to install nvm, verify Node/npm versions, and follow team practices so we avoid `package-lock.json` merge conflicts.

---

## Part 1: Install nvm (if you don’t have it)

### macOS / Linux (including WSL)

1. **Install nvm** with the official script. In a terminal, run:

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   ```

   If you use **wget** instead of curl:

   ```bash
   wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   ```

2. **Load nvm** in your current shell (or open a new terminal):

   - **Zsh** (default on macOS): `source ~/.zshrc`
   - **Bash**: `source ~/.bashrc`

3. **Verify nvm is installed:**

   ```bash
   nvm --version
   ```

   You should see a version number (e.g. `0.40.1`).

**Note:** On macOS, install Xcode Command Line Tools first if needed: `xcode-select --install`.

---

## Part 2: Use the same Node (and npm) version as the team

### Step 1: Install the project’s Node version

If the repo has an **`.nvmrc`** file (recommended), use it:

```bash
cd /path/to/DigitalTwin
nvm install    # installs the version in .nvmrc
nvm use        # switches to that version
```

If there is **no `.nvmrc`**, agree on one Node version (e.g. LTS 22) and run:

```bash
nvm install 22
nvm use 22
```

(Optional) Set it as your default so new terminals use it:

```bash
nvm alias default 22
```

### Step 2: Verify which Node and npm you’re using

Run:

```bash
node -v
npm -v
```

- **node -v** — e.g. `v22.12.0` (must match what the team agreed on).
- **npm -v** — e.g. `10.9.2` (comes with that Node version; no separate install needed).

Before pushing or merging, **everyone should see the same `node -v` and `npm -v`** when in this project.

### Step 3: Quick check before you start work

Each time you open the project (or after pulling), run:

```bash
nvm use          # if .nvmrc exists
node -v
npm -v
```

If versions don’t match the team’s, run `nvm install` with the correct version and then `nvm use`.

---

## Part 3: Team practices (avoid package-lock conflicts)

### 1. One Node version for the project

- Decide on a single Node version (e.g. **Node 22 LTS**).
- Add an **`.nvmrc`** file in the repo with that version (e.g. `22` or `22.12.0`) so `nvm use` works for everyone.
- Document the chosen version in the README or this doc.

### 2. Sync with main before changing dependencies

- **Merge or rebase from `main` (or your base branch) before adding or changing dependencies.**
- Then change `package.json`, run `npm install` once, and commit both `package.json` and `package-lock.json` together.
- This reduces the chance that two branches each generate a different lockfile and conflict.

### 3. Prefer one “dependency owner” per sprint (optional)

- If possible, have one person (or one branch) handle all dependency updates in a given sprint; others merge that branch before adding new deps.
- This minimizes parallel edits to `package-lock.json`.

### 4. When you get a merge conflict in `package-lock.json`

**Do not edit the lockfile by hand.** Do this instead:

1. Resolve any other merge conflicts (e.g. in `package.json` or source files) first.
2. For `package-lock.json` only:
   - Pick one side (usually the branch you’re merging **into**):
     ```bash
     git checkout --ours package-lock.json
     ```
     (Use `--theirs` if your team prefers the incoming branch’s lockfile as the base.)
   - Regenerate the lockfile from the **merged** `package.json`:
     ```bash
     npm install
     ```
   - Stage the result:
     ```bash
     git add package-lock.json
     ```
3. Finish the merge: `git add` any other resolved files, then `git commit`.

Result: a single, correct lockfile that matches the merged dependencies and your Node/npm version.

---

## Summary checklist

| Step | Action |
|------|--------|
| 1 | Install nvm (Part 1). |
| 2 | Run `nvm use` (or `nvm install` + `nvm use` with team’s version). |
| 3 | Run `node -v` and `npm -v` and confirm they match the team. |
| 4 | Before changing deps: merge/rebase from main, then edit `package.json` and run `npm install`. |
| 5 | If `package-lock.json` conflicts: `git checkout --ours package-lock.json`, then `npm install`, then `git add package-lock.json`. |

For general workflow (branches, PRs, board), see [CONTRIBUTING.md](../CONTRIBUTING.md).
