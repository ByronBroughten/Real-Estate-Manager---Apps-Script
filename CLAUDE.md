# Claude instructions for this repo

Read `README.md` before making non-trivial changes — it explains the architecture, naming vocabulary, and generated-data boundaries this project depends on. The short version:

- **`src/00_*`–`05_Api/` are a generic Sheets+Apps-Script framework; `src/businessEndpoints/` is the only place real-estate-specific logic belongs.** Dependencies only point downward by folder number — never import from a higher-numbered tier. `businessEndpoints/` sits outside the numbering (like `utils/`) and may import from any tier.
- **`02_SpreadsheetRaw` is raw-index Sheets API access only** — whole rows/columns by GID + index, sheet properties, and `UniformRowRaw`. It never resolves a column by name or `columnId`; that's `03_SpreadsheetIndexed`/`04_SpreadsheetNamed`'s job, including generating/updating `01_generatedConfigs` (`SheetConfigOperator`/`ColumnConfigOperator`, tier 04) — config maintenance is no longer Raw's responsibility.
- **Never run `clasp push`, `clasp run`, `clasp deploy`, `npm run build`, or `npm run gen:sheet-config` without asking first.** They affect a live Apps Script deployment and read the user's real Google Sheet. `npm run tsc` is always safe.
- **Don't hand-edit the generated data** in `sheetConfigs`/`columnConfigs`/`valueConfigs` (`src/01_generatedConfigs/`) — regenerate from the spreadsheet instead, per README. Exception: the small hardcoded bootstrap subset covering the Sheet Config/Column Config sheets themselves is meant to stay hand-maintained (see README).
- **This code runs in Google Apps Script, not Node.** No Node/DOM APIs at runtime — only in build tooling.
- **There is no test suite.** `npm run tsc` is the whole verification story; run it before calling any change done.
- `src/businessEndpoints.ts` is live (wired into `triggerOnEdit` via `05_Api`'s `Api` class), but the domain classes it will eventually call (`ChargeMgmt`, `ExpenseMgmt`, `LeaseMgmt`, `LedgerMgmt`, `PaymentMgmt`, `SubsidyMgmt`) are still fully commented out, pre-reorg legacy awaiting reimplementation. `src/02_SpreadsheetRaw/toIntegrate.ts` is a deliberate staging file. None of this is broken — all expected states.

The naming words **Raw / Indexed / Named / Trait / Config / Schema** are used precisely (defined in README.md). If you're placing or renaming a file and unsure which applies, ask rather than guess.
