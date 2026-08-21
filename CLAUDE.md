# Claude instructions for this repo

Read `README.md` before making non-trivial changes — it explains the architecture, naming vocabulary, and generated-data boundaries this project depends on. The short version:

- **`src/00_*`–`04_*` are a generic Sheets+Apps-Script framework; `src/05_BusinessClasses/` is the only place real-estate-specific logic belongs.** Dependencies only point downward by folder number — never import from a higher-numbered tier.
- **`01_SpreadsheetRaw` is raw-index Sheets API access only** — whole rows/columns by GID + index, sheet properties, and `UniformRow`. It never resolves a column by name or `columnId`; that's `03_SpreadsheetIndexed`/`04_SpreadsheetNamed`'s job, including generating/updating `02_generatedTraits` (`SheetConfigNamed`/`ColumnConfigNamed`, tier 04) — trait maintenance is no longer Raw's responsibility.
- **Never run `clasp push`, `clasp run`, `clasp deploy`, `npm run build`, or `npm run gen:sheet-traits` without asking first.** They affect a live Apps Script deployment and read the user's real Google Sheet. `npm run tsc` is always safe.
- **Don't hand-edit the generated data** in `allSheetTraits`/`allColTraits`/`valueTraits` (`src/02_generatedTraits/`) — regenerate from the spreadsheet instead, per README. Exception: the small hardcoded bootstrap subset covering the Sheet Config/Column Config sheets themselves is meant to stay hand-maintained (see README).
- **This code runs in Google Apps Script, not Node.** No Node/DOM APIs at runtime — only in build tooling.
- **There is no test suite.** `npm run tsc` is the whole verification story; run it before calling any change done.
- `src/05_BusinessClasses/*.ts` are currently all commented out (pre-reorg legacy, awaiting reimplementation) and `src/01_SpreadsheetRaw/toIntegrate.ts` is a deliberate staging file — neither is broken, both are expected states.

The naming words **Raw / Indexed / Named / Trait / Config / Schema** are used precisely (defined in README.md). If you're placing or renaming a file and unsure which applies, ask rather than guess.
