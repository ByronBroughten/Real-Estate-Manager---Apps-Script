Cursor denies a code edit until this session has read the style docs. Claude's STYLE gate is the same deny for the general doc; this file is the Cursor half. Why it denies instead of injecting the docs: [`docs/agent-behavior-design.md`](./agent-behavior-design.md).

## The style gate

`.cursor/hooks.json` runs `.cursor/hooks/styleGate.ts` before a `Write` (Cursor's name for an edit) and after a `Read`. A `Read` of `config/docs/style.md` that covers the whole file (no `offset` or `limit` short of the end) is recorded for the session. An edit to a file ESLint lints waits for that read. An edit under `packages/framework/` or `packages/real-estate/` also waits for the same kind of read of `packages/framework/docs/style.md`. Generated files are left to Claude's generated-edit warning. The decision is `.claude/hooks/lib/styleGate.ts`, tested beside it.

The general-doc marker is the same `$TMPDIR/claude-guardrails/` file Claude's STYLE gate writes, so either hook can record it. The framework doc uses `framework-style-read` in that directory. Both are keyed by session id. Cursor spells the read event `postToolUse`; Claude's hook accepts that spelling too ([`docs/claude-code-guardrails.md`](./claude-code-guardrails.md)). A crash exits nonzero and the edit proceeds.

`.cursor/rules/typescript-shape.mdc` names those reads when a TypeScript file is in play. It does not inline the rules. Reasoning stays under each doc's `docs/style/`.
