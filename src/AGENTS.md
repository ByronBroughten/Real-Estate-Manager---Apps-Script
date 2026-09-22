# Rules for `src/`

- `00_Source`: the Source: cell values, the host-neutral `RawSource` port, and `GoogleSheets/`, the platform module.
- `01_SpreadsheetSchema`: everything that reads the generated configs, which live in `generated/`.
- `02_SpreadsheetRaw`: positional I/O by sheet GID and row/column index; never resolves a column.
- `03_SpreadsheetIdentified`: addresses sheets and columns by generated identity (GID + column ID).
- `04_SpreadsheetNamed`: the name-based API most code should use.
- `05_Operators`: classes on a Named base, suited to one data structure, config regeneration included.
- `06_API`: generic endpoint dispatch (`Api`, `EndpointRun`), handed its endpoint map.
- **Dependencies point only downward; lint holds the numbered tiers and `utils/` to it.** A file goes in the lowest tier that satisfies it. `utils/` is below every tier; `businessEndpoints`, `chores/`, `nodeHost/` and `index.ts` sit above them all.
- **Before adding a file, ask "would this make sense in a different Sheets-backed app?"** Yes: tiers 00–06, generically named. No: `businessEndpoints/`, or `chores/` for a one-off job.
- **`src/` is host-neutral, `nodeHost/` included: no Node or DOM APIs.** It is platform-neutral outside `00_Source/GoogleSheets/` and the entry points. Lint holds both.
- **Regenerate, never hand-edit, the data in `01_SpreadsheetSchema/generated/`.** Read by block: grep `columnConfigs.ts` for the sheet key (`"occupancy":`) and read that one object; open a long test file's one `describe`.
- **A guard ships in the same commit as the write it guards, or earlier**: a standing-permission `gen:configs` run can land between any two commits.
- **Read [STYLE.md](../STYLE.md) before editing TypeScript here.** Words: [VOCABULARY.md](../VOCABULARY.md). Mechanics: the [`docs/architecture.md`](../docs/architecture.md) index.
