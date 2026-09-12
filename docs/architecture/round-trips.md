# Round trips are the cost

Map fragment. Sibling headings live in this folder.


Every call to the Sheets API funnels through exactly two methods — `SpreadsheetRaw.fetchAllGathered` (reads) and `SpreadsheetRaw._sendUpdateRequests` (writes). Instrument those two and you have measured everything. Why the cost is deliberately funnelled that way: [`DESIGN.md`](../../DESIGN.md), "Funnel the expensive thing through one place".

Measured against the live spreadsheet (Sept 2026): a round trip costs **~250–450ms**, while the framework's own CPU for a whole trigger is **~20–60ms**. Making the code faster does not move the number; removing a round trip is the only thing that does. The `triggerOnEdit` **dispatch** is down to two — one read for the column indexes and table bounds, one write — which is the floor, since neither can be derived without asking the API. A *runner* costs more, and the extra write is deliberate: the setup flush is what puts the running state on the sheet before the work starts.

`fetchAllPrepped` is two-phase by design — one `fetchAllGathered` for prerequisites, then one for the data ranges prepped against the indexes the first phase resolved — and `fetchAllGathered` no-ops when nothing is gathered. **A read prepped into that second phase is free whenever a prerequisite fetch is already happening**, which is the lever for adding a data read to a trigger without adding a round trip.

**A table's range reaches state by two routes, with different coverage.** `fetchAllSheetProperties` issues one `Spreadsheets.get` and returns every sheet's table range unconditionally; in production only `ConfigOrchestrator` calls it, at the top of a config sync. Every other path, the `triggerOnEdit` dispatch included, gets table metadata only as a side effect of `getByDataFilter`, which returns a sheet's `tables` for a filter whose range overlaps the table and otherwise omits it silently. That is why `SheetRaw.gatherFetchProperties` probes the cell at the header row and start table column: it is the cheapest cell guaranteed to sit inside the table, and guaranteed only while the table is where the config says it is.

**`SpreadsheetApp` is not a cheaper alternative, despite the intuition that a trigger already has the sheet open.** Measured the same day: `getLastRow()` + `getLastColumn()` + `getRange().getValues()` cost ~494ms against ~350ms for the single `getByDataFilter` they would have replaced. Each `SpreadsheetApp` call is its own round trip. This was tested and rejected — don't re-propose it without new measurements.

