# Claude instructions for this repo

Open only the section or disclosed doc the task needs.

Four files, four jobs: **README.md** is the map (tiers + [Naming vocabulary](./README.md#naming-vocabulary)); **STYLE.md** is code shape; **CONTEXT.md** is operator-facing words; **DESIGN.md** is why, including deliberate absences. Architecture mechanics: [`docs/architecture.md`](./docs/architecture.md) index, then one file. Hosts, MCP, live-sheet commands: [`docs/how-it-runs.md`](./docs/how-it-runs.md). A plan or spec includes the matching prose-file edit in its own scope.

## Guardrails

- Never `clasp push` / `clasp run` / `clasp deploy`, `npm run build`, or `npm run chore <name> -- --send` without asking. A send needs a yes **naming that chore**.
- `npm run tsc` and a chore dry run (`npm run chore <name>`, no `--send`) are always safe. Dry-run writes cannot reach Google: suppression is in the Node host adapter.
- `npm run gen:configs` has standing permission only when **all four** hold: no uncommitted changes in `src/01_generatedConfigs/`; none in `src/05_Operators/`; report what changed **and the untyped-column count**; never a blind fix for an unidentified type error. One regeneration path. Sheet-shape bugs are fixed on the sheet, then regenerated. After any sheet change, read the regenerated entry before building on it. [`docs/generated-data.md`](./docs/generated-data.md).
- Don't hand-edit `sheetConfigs` / `columnConfigs` / `valueConfigs`. Exception: the config-sheet floor (`sheetConfig`, `columnConfig`, `spreadsheetConfig`, `valueConfig`).
- **Never read `columnConfigs.ts` whole.** `sheetConfigs.ts` is the sheet list; grep `columnConfigs.ts` for the sheet key (`"occupancy":`) and read that object only.
- Understand a class from its implementation. Open the sibling `Foo.test.ts` when changing tests.
- gsheets MCP reads (`list_spreadsheets`, `list_sheets`, `get_sheet_data`) are always fine. Writes need an exact plan (sheet/range/values or new sheet) and a yes. `share_spreadsheet` needs its own yes: who, and at what permission.
- Commit to `master` by default. Branch only if asked, or if other work is already in flight — then ask which. Commit or push only when asked.
- No Node/DOM APIs in `src/` (`nodeHost/` included). Node-specific half is `scripts/*.mjs`.
- Tests: `npm test` is always safe. Co-locate `Foo.test.ts`; GAS fakes live in `src/testSupport/`. Run `tsc` and tests before calling a change done. [`docs/testing.md`](./docs/testing.md).
- Type-level claims: `IsExactly` / `assertType` / `assertNotType` from `src/testSupport/typeAssertions.ts` — never assignment, never a probe that needed `any`. See STYLE.md "Type modeling".
- Adding a deletion path: a sheet never ends a run with zero data rows — [`docs/architecture/blank-row.md`](./docs/architecture/blank-row.md).
- A one-off against the live sheet is a chore — no scratch `src/index.ts` function, no ad-hoc `scripts/` Sheets client, no deploy-to-run. `gatherRawRequest` obliges an issue naming the missing capability. [`docs/architecture/chores.md`](./docs/architecture/chores.md), [`docs/architecture/raw-request-opening.md`](./docs/architecture/raw-request-opening.md).
- During design or grilling, write nothing until the user invokes the skill that files it.
- Don't create `docs/adr/`.

## Read by task

| When | Open |
| --- | --- |
| Placing a file, import, or member | README tier table + Naming vocabulary |
| Writing TypeScript | `STYLE.md` |
| Endpoint / selector / run state / blank row (operator words) | `CONTEXT.md` |
| Arguing a gap is missing | `DESIGN.md` |
| Dispatch | `docs/architecture/endpoint-dispatch.md` |
| Schema classes | `docs/architecture/schema-classes.md` |
| Meta / class chains | `docs/architecture/class-chains.md` |
| Queued writes | `docs/architecture/queued-writes.md` |
| Round trips | `docs/architecture/round-trips.md` |
| Type-check cost | `docs/architecture/type-check-cost.md` |
| Hosts, chore dry run, MCP | `docs/how-it-runs.md` |
| A slash-named skill not in the listing | `.claude/skills/<name>/SKILL.md` — never a similarly-named substitute. `grill-with-docs` is grilling + domain-modeling. |

## Agent skills

Issues and specs: GitHub repo `ByronBroughten/Real-Estate-Manager---Apps-Script` via `gh`. See `docs/agents/issue-tracker.md`. Triage labels: `docs/agents/triage-labels.md`. Domain vs architecture vocabulary: `docs/agents/domain.md`.
