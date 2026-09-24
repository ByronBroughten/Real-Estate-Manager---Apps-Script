# Claude Code guardrails

Mechanics of the Claude Code hooks and project agent. Why they are shaped this way: [`docs/agent-behavior-design.md`](./agent-behavior-design.md).

Six Node hooks in `.claude/hooks/`, registered in `.claude/settings.json`: three gate a call (the Bash-read guard, the pinned-target guard and the STYLE gate) and three add a reminder. All fail open except where noted. Session state lives in `$TMPDIR/claude-guardrails/`.

## The hooks and the project agent

`.claude/settings.json` registers six Node hooks in `.claude/hooks/`, fail-open (bad input allows the call) unless noted, plus one project agent. `bashReadGuard.mjs`, `pinnedTargetGuard.mjs` and `styleGate.mjs` gate a call; the others add a reminder.

- **`bashReadGuard.mjs`** (PreToolUse, Bash) denies a Bash read of `columnConfigs.ts`, unless it is a grep or a `sed -n` range of at most 150 lines. It also denies a whole-file dump (`cat`, unbounded `head`/`tail`, `sed` without `-n`, `sed -n '1,$p'`) of a repo file over 150 lines. The deny message names the alternative. Piped input, small files, anything under a `.probe/`, `dist/`, `coverage/` or `node_modules/` folder at any depth, and anything outside the repo are not guarded. The `columnConfigs.ts` it guards is every package's, found through the `generatedDir` in each `sheets.config.json` (`lib/sheetsConfigs.mjs`). `lib/bashReads.mjs` is tested beside it. The classifier (`lib/bashReads.mjs`) is shared with `readCountNudge.mjs`.
- **`pinnedTargetGuard.mjs`** (PreToolUse, Bash and gsheets `update_cells`/`batch_update_cells`/`create_sheet`) keeps the dev standing yes pinned to the dev spreadsheet. It turns an allowed `dev:*` write (`dev:gen:configs`, `dev:chore … --send`, `dev:build`, `dev:push`, `dev:run`) into ask while a pinning file (both `sheets.config.json` files, the guard and its libs) has uncommitted changes. It allows a gsheets write only when `spreadsheet_id` is the dev ID from `dev/sheets.config.json` and the pinning files are clean, and otherwise asks. An unreadable git state or config asks. A crash fails open on the Bash side, leaving the allow rule, and closed on the gsheets side, leaving the default ask. The decision is `lib/pinnedTargets.mjs`, tested beside it. The isolation table it enforces: [`docs/how-it-runs.md`](./how-it-runs.md#targets-dev-and-app).
- **`generatedEditWarning.mjs`** (PreToolUse, Edit/Write) warns, without blocking, before an edit inside any package's `generatedDir`, naming that package's `*:gen:configs`: regenerate instead, floor entries included: fix the live tab or the seed ([`docs/generated-data.md`](./generated-data.md)).
- **`styleGate.mjs`** (PostToolUse, Read; PreToolUse, Edit/Write) records a Read of `docs/style.md` that covers the whole file (no `offset` or `limit`, or bounds reaching its last line), and denies an edit to a `src/**/*.ts` file until that read is recorded for the session. Generated files, every package's `generatedDir`, are left to `generatedEditWarning.mjs`. The decision is `lib/styleGate.mjs`, tested beside it.
- **`readCountNudge.mjs`** (PostToolUse on Read/Grep/Glob/Bash; reset on UserPromptSubmit) counts reads per turn: Read, Grep, Glob, and Bash calls the classifier calls reads. Edits, `tsc` and test runs are not counted. At 15 reads, and every 10 after, it reminds Claude to write findings down with `file:line`. Each subagent has its own count, and `repo-explorer` is exempt.
- **`contextSizeNudge.mjs`** (UserPromptSubmit) estimates context from the transcript's last main-thread usage figures, falling back to bytes ÷ 4. It warns once past ~400k and once past ~1M; the second warning asks for a handoff ([`docs/agents/planning.md`](./agents/planning.md#handoffs)) and a fresh session.
- **`.claude/agents/repo-explorer.md`** is a read-only (Read/Grep/Glob) Sonnet agent for sweeps of about 5+ files. It returns `file:line` plus verbatim quotes.

## Per-session state

Per-session state (the read log, which size warnings have fired, and whether docs/style.md was read) lives in `$TMPDIR/claude-guardrails/`, keyed by session id.
