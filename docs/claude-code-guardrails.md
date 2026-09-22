# Claude Code guardrails

Mechanics of the Claude Code hooks and project agent. Why they are shaped this way: [`docs/agent-behavior-design.md`](./agent-behavior-design.md).

Five fail-open Node hooks in `.claude/hooks/`, registered in `.claude/settings.json`: two gate a call (the Bash-read guard and the STYLE gate) and three add a reminder. Session state lives in `$TMPDIR/claude-guardrails/`.

## The hooks and the project agent

`.claude/settings.json` registers five Node hooks in `.claude/hooks/`, all fail-open (bad input allows the call), plus one project agent. `bashReadGuard.mjs` and `styleGate.mjs` gate a call; the others add a reminder.

- **`bashReadGuard.mjs`** (PreToolUse, Bash) denies a Bash read of `columnConfigs.ts`, unless it is a grep or a `sed -n` range of at most 150 lines. It also denies a whole-file dump (`cat`, unbounded `head`/`tail`, `sed` without `-n`, `sed -n '1,$p'`) of a repo file over 150 lines. The deny message names the alternative. Piped input, small files, and anything under `.probe/`, `node_modules/` or outside the repo are not guarded. The classifier (`lib/bashReads.mjs`) is shared with `readCountNudge.mjs`.
- **`generatedEditWarning.mjs`** (PreToolUse, Edit/Write) warns, without blocking, before an edit inside `src/01_SpreadsheetSchema/generated/`: regenerate instead, floor entries included: fix the live tab or the seed ([`docs/generated-data.md`](./generated-data.md)).
- **`styleGate.mjs`** (PostToolUse, Read; PreToolUse, Edit/Write) records a Read of `STYLE.md`, and denies an edit to a `src/**/*.ts` file until that read is recorded for the session. Generated files are left to `generatedEditWarning.mjs`. The decision is `lib/styleGate.mjs`, tested beside it.
- **`readCountNudge.mjs`** (PostToolUse on Read/Grep/Glob/Bash; reset on UserPromptSubmit) counts reads per turn: Read, Grep, Glob, and Bash calls the classifier calls reads. Edits, `tsc` and test runs are not counted. At 15 reads, and every 10 after, it reminds Claude to write findings down with `file:line`. Each subagent has its own count, and `repo-explorer` is exempt.
- **`contextSizeNudge.mjs`** (UserPromptSubmit) estimates context from the transcript's last main-thread usage figures, falling back to bytes ÷ 4. It warns once past ~400k and once past ~1M; the second warning asks for a handoff ([`docs/agents/planning.md`](./agents/planning.md#handoffs)) and a fresh session.
- **`.claude/agents/repo-explorer.md`** is a read-only (Read/Grep/Glob) Sonnet agent for sweeps of about 5+ files. It returns `file:line` plus verbatim quotes.

## Per-session state

Per-session state (the read log, which size warnings have fired, and whether STYLE.md was read) lives in `$TMPDIR/claude-guardrails/`, keyed by session id.
