# 📘 Digital Twin Capstone - Team Workflow

Welcome to the team workflow guide! We are using **GitHub Projects** to track our work efficiently. The goal is to spend less time managing tasks and more time coding.

## 🎯 The Golden Rule
**If it's not on the Board, it's not happening.**
The [Project Board](https://github.com/orgs/BC-DigiTwin/projects/2) is our single source of truth.

---

## 🛠 Step-by-Step Workflow

### 1. Pick a Task
1. Go to the **Project Board**.
2. **Filter by Team:** Click the filter icon or use the Tabs to see just `3D Team` or `Cloud/UI Team` tasks.
3. Look at the **Todo** column.
4. Drag a card to the **In Progress** column.
5. **Assign Yourself:** Click the card and add your username to the `Assignees` list (right sidebar).

### 2. Start Coding (Branching)
Never push directly to `main`. Always work on a branch.
1. Create a new branch for your task.
   * *Naming Convention:* `feature/short-description` or `fix/issue-name`.
   * *Example:* `git checkout -b feature/camera-rig`

### 3. Submitting Your Work (The Magic Step ✨)
When you are ready to merge your code:
1. Push your branch to GitHub.
2. Go to the "Pull Requests" tab and click **New Pull Request**.
3. **CRITICAL:** In the description of your PR, you must link it to the Issue card using "Magic Words".
   * Type: `Closes #12` (replace 12 with your issue number).
   * *Why?* This tells GitHub to **automatically move your card to the "Done" column** when the PR is merged. No manual dragging required!

### 4. Review & Merge
1. Request a review from a teammate (if applicable).
2. Once approved, click **Squash and Merge** (keeps our history clean).
3. Delete your branch after merging.

---

## 💡 Quick Tips

* **Edit in Bulk:** If you need to change the status or Team for many tasks at once, switch the Project view to **"Table"** (spreadsheet view). You can drag-to-fill cells just like in Excel.
* **Stuck?** If a task is blocked (e.g., waiting on API), create a label called `Blocked` on the issue so we see it in the standup.