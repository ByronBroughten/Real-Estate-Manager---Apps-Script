# Git workflow

- **Commit or push only when asked.** A skill's approval step covers its edits, not a commit. Ask before committing, and ask which branch to use.
- **Implement a spec on a branch named for it**: `issue-<n>-<short-slug>`. If other work is already in flight, ask which branch to use.
- **After a spec is implemented**, ask whether to land that branch on `master` (merge and push), and whether to close the implemented issue or sub-issue (`gh issue close <n>`), naming the number.
- **A `backup/*` branch is single-session scaffolding.** Take one before a history rewrite, retire it once the rewrite is verified, and say so. If a stale one exists, report it with its ahead/behind counts before starting other git work.
- Commit messages and `gh` writes from a dispatched agent go back to the main session: [`delegation.md`](./delegation.md).
