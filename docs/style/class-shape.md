# Class shape

Style fragment. The one-line rules live in [`STYLE.md`](../../STYLE.md); this file holds the reasoning and the worked examples.


## Coordinator classes

When code coordinates other stateful objects (other Operators, a Spreadsheet), write it as a **coordinator class** extending the tier's Base class (matching `SheetConfigOperator`).

This was mined from the framework tiers. It does **not** govern business endpoints: an endpoint is a plain entry with module-private helpers, matching the endpoints already in the registry. Reach for a class only once a file is unwieldy or its logic finds a second caller.

- **`init`** is how a caller outside the class builds one; **`new`** is how a class builds its own collaborators from props already on `this`. `init` takes whatever the caller already holds — nothing at all for an entry point that starts a run (`ConfigOrchestrator.init()`), or a live collaborator whose state must be shared, as when an endpoint action builds an operator from the `ss` it was handed — and assembles the props itself. A collaborator reached from props already on `this` skips `init` and is constructed directly in a getter: `new ColumnConfigOperator(this.spreadsheetNamedProps)`. Either way the real constructor just takes a `props` object.
- Collaborators (`ss`, `sheetConfigOperator`, `schema`, etc.) are lazy getters built from shared props on `this`.

```ts
export class ConfigOrchestrator extends SpreadsheetNamedBase {
  static init(): ConfigOrchestrator {
    return new ConfigOrchestrator(ConfigOrchestrator.initSpreadsheetNamedProps());
  }
  get sheetConfigOperator() {
    return new SheetConfigOperator(this.spreadsheetNamedProps);
  }
  get columnConfigOperator() {
    return new ColumnConfigOperator(this.spreadsheetNamedProps);
  }
  syncAndFlushConfigSheets() {
    this.sheetConfigOperator.fetchAndUpdateAll();
    this.columnConfigOperator.fetchAndUpdateColumnConfig();
    this.ss.batchUpdateGSheets();
  }
}
```

Callers reach `orchestrator.sheetConfigOperator` on the instance. The method returns nothing.

## An Operator extends a `*NamedBase` and reaches its subject through a getter

Whatever an Operator operates on — a sheet, a column — it extends that thing's `*NamedBase` class and adds methods suited to that data structure. It does **not** extend the concrete class it works through, and it doesn't take one as a constructor argument: the subject is a lazy collaborator getter built from the props already on `this`, named for what it is (`ss`, `sheet`, `column`). `GenericSheetOperator extends SheetNamedBase<SN>` with `ss`/`sheet`/`schema` getters is the reference shape — `sheet` is the primary (data) sheet, and the metadata view is `sheet.meta`; a column-scoped operator extends `ColumnNamedBase<SN, CN>` and exposes a `column` getter the same way.

Inheriting the concrete class instead would put its whole surface on the operator, which is the opposite of what the operator is for — it exists to offer a *narrower*, more specific set of methods than the general class does.

## Push a domain query onto the object that owns it

When a coordinating class composes several calls on a collaborator to answer one domain question, that composition belongs on the collaborator as its own named method — not re-inlined at every call site. `ColumnConfigOperator` used to reach through `sheet.uniformRow("columnId").activeValueArr` and `.hasValue(columnId)` directly; that logic moved onto `SheetMetaNamed` itself as `get activeColumnIds()` and `isActiveColumnId(columnId)`, and `ColumnConfigOperator`'s own private helper now just delegates:

```ts
private _isActiveColumnId(sheetGid: number, columnId: string): boolean {
  return this.ss.raw.sheetMeta(sheetGid).isActiveColumnId(columnId);
}
```

Destructure a collaborator's getter directly when only one property is needed: `const { activeColumnIds } = this.ss.raw.sheetMeta(sheetGid);`.

A container method that takes an index/id as a parameter, but is only ever called by code that already has that exact value as its own instance state, is a sign the query belongs on the instance instead — drop the parameter along with the method. `SheetRawBase.columnValidationValues(colIndex: number)` was deleted; its one caller always already had its own `colIndex`, so the query moved to `ColumnMetaRaw` as `get valueValidationStrings()`, reading `this.activeTable.columnValidationValues.get(this.colIndex)` (`ColumnMetaRaw.ts`). The parameter disappearing is what turns it into a getter (see the getter rule in [naming.md](./naming.md)).

## Extract the shared piece when the second caller is foreseen, not when it arrives

Keeping a helper private until a second call site actually exists is the wrong default here. When the sibling caller is already visible — another sheet of the same shape, another endpoint of the same family — build the shared class now and put it where the framework keeps its operators. The name-to-ID resolver was written as a general operator on its first caller because Add Occ Charge and Add Occ Payment obviously want it (#24). The same judgment governs framework behaviour an endpoint asks for: build the general form rather than the one fitted to the endpoint that asked, which is why per-row reporting serves any endpoint instead of only the batch one that motivated it (#23). This is not licence to build for imagined callers, and DESIGN.md's "Record a deliberate absence as deliberate" still governs a feature nobody has asked for. The test is whether you can name the second caller.

## Model state at the granularity the concept actually has

The principle and its other instances live in DESIGN.md; what follows is where it lands on member placement. A member that **samples the top data row to derive a column-wide fact** belongs on the Meta column — that is membership criterion 2 of the Meta/primary axis (README.md, "Naming vocabulary"), and `isFormula`/`numberFormatType` are the case that produced it. They match `ColumnSchema.isFormula`, the schema-based trait, and are read off the column's top data-row cell only because that is how the API delivers them; so they live as `activeIsFormula`/`activeNumberFormatType` on `ColumnMetaRaw`, populated once per column by `SheetRaw._integrateSheetData`, not as per-row/per-cell state on `CellRaw`/`RowRawBase`.

The criterion bites on the derived fact, not on row or cell addressing: `topCell` and `topRow` stay primary, or a Meta class would end up handing out data rows.

## Class member order

1. `static init()`
2. Plain getters for derived collaborators/state (`ss`, `schema`, `sheetConfigOperator`, ...)
3. Public behavior methods
4. Private helpers, `_`-prefixed — ordered so a helper used by only one caller sits immediately after that caller (detail follows the step that needs it); a helper reused by several later methods comes first, in the order of its first use. (`_initSheetGidsApiAccesses`/`_isSheetGidApiAccesses`, each used by multiple methods, sit first in `ColumnConfigOperator`; `_isActiveColumnId`, called only by `_pruneColumnRows`, sits directly after it.)

## Delete dead scaffolding you touch — with one exception

Editing a file is the moment to remove, not preserve, a stub nothing calls, a placeholder function (`function triggerAuth(): void { return; }`), or a variable instantiated and discarded (`const columnConfig = ColumnConfigOperator.init();` with no use of `columnConfig`). An empty function body is better than a dead unused variable or an unreferenced helper kept "in case."

**Exception: commented-out code.** Flag it and ask before deleting — don't remove it as part of a cleanup pass. It might be an intentional breadcrumb rather than leftover cruft.

**Zero callers is not proof of dead.** Some members are parked for planned work and carry no marker distinguishing them from cruft — `SheetRaw.validateRowIndexes` and `SheetRaw.requestSortGSheet` are both intentional. A grep-derived list of uncalled members is a set of candidates, not a verdict: name what you found and ask, rather than deleting on the count. A member whose only caller is a test is a third case again — deleting it deletes coverage.

## Keep "why" comments across a refactor

A comment explaining a non-obvious invariant (e.g. why two sheets must sync in one flush) carries over verbatim across a restructure — it documents the invariant, not the code shape around it.

