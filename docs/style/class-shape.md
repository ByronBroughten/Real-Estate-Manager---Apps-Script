# Class shape

Style fragment. The one-line rules live in [`STYLE.md`](../../STYLE.md); this file holds the reasoning and the worked examples.

One heading per class-shape rule, most of them with the refactor that produced it: grep `^## ` for the rule you're applying and read that section.


## Coordinator classes

When code coordinates other stateful objects (other Operators, a Spreadsheet), write it as a **coordinator class** extending the tier's Base class (matching `SheetConfigOperator`).

This was mined from the framework tiers. It does **not** govern business endpoints: an endpoint is a plain entry with module-private helpers, matching the endpoints already in the registry. Reach for a class only once a file is unwieldy or its logic finds a second caller.

**What unwieldy meant, the one time it was crossed.** `buildLedger.ts` was 303 lines holding eighteen free functions, and almost every one of them existed to thread a collaborator through: the spreadsheet appeared in six of their signatures, the occupancy id in three, and a map of charges keyed by id in one more (#22). The number is the threshold's first data point, not its definition — what made it unwieldy was the threading, and the win was signatures rather than lines, since the body came out about the same length as `OccupancyLedgerOperator`.

- **`init`** is how a caller outside the class builds one; **`new`** is how a class builds its own collaborators from props already on `this`. `init` takes whatever the caller already holds — nothing at all for an entry point that starts a run (`ConfigCoordinator.init()`), or a live collaborator whose state must be shared, as when an endpoint action builds an operator from the `ss` it was handed — and assembles the props itself. A collaborator reached from props already on `this` skips `init` and is constructed directly in a getter: `new ColumnConfigOperator(this.operatorProps)` when the collaborator needs config-sync state, otherwise `new SpreadsheetNamed(this.spreadsheetNamedProps)`. Either way the real constructor just takes a `props` object.
- Collaborators (`ss`, `sheetConfigOperator`, `schema`, etc.) are lazy getters built from shared props on `this`.

```ts
export class ConfigCoordinator extends SpreadsheetBaseOperator {
  constructor(props: SpreadsheetNamedProps) {
    super({
      ...props,
      configSyncState: SpreadsheetBaseOperator.initConfigSyncState(),
    });
  }
  static init(): ConfigCoordinator {
    return new ConfigCoordinator(
      SpreadsheetBaseNamed.initSpreadsheetNamedProps(),
    );
  }
  get sheetConfigOperator() {
    return new SheetConfigOperator(this.operatorProps);
  }
  get columnConfigOperator() {
    return new ColumnConfigOperator(this.operatorProps);
  }
  syncAndFlushConfigSheets() {
    this.sheetConfigOperator.fetchAndUpdateAll();
    this.columnConfigOperator.fetchAndUpdateColumnConfig();
    this.ss.batchUpdateGSheets();
  }
}
```

Callers reach `orchestrator.sheetConfigOperator` on the instance. The method returns nothing.

## Split a coordinator when its helpers share nothing

A coordinator splits when its private helpers form groups that share no helpers with each other; each group becomes a collaborator. Method count doesn't decide it, because a long class whose helpers all call each other has no seam to cut along, and a short one with two unrelated jobs does. `SpreadsheetRaw` had 26 private helpers in three such groups: finishing a gathered fetch, checking that each sheet's Table is where the layout requires, and turning queued changes into a batch update and sending it. A reader looking for one job had to scroll through the other two (#67).

- **Collaborators follow the coordinator rules above.** They extend the tier's Base class, are built with `new` from the coordinator's props, and are reached through lazy getters (`fetcher`, `flusher`). A collaborator that needs another reaches it the same way: `SpreadsheetFetcherRaw` builds its own `tableValidator`, because finishing a fetch is what decides which Tables to judge.
- **The split is internal.** The coordinator keeps each public method as a one-line delegation, so no caller and no test changes, and the collaborators get no tests of their own: the coordinator's tests already cover them.
- **Collaborators live in a subfolder named after their coordinator** (`02_SpreadsheetRaw/SpreadsheetRaw/`), so the tier root lists only the classes callers use. A base class serves a whole chain of classes, often across tiers, so it stays in `ClassBases/` and never goes in one coordinator's subfolder.
- **A collaborator reaches back to the coordinator's shared surface through a getter named for it**: `ss` for a spreadsheet coordinator, as `SpreadsheetFlusherRaw` does, and `sheet` for a sheet one, as `SheetEditProtectionsRaw` does, rather than copying `sheet(sheetGid)` into each collaborator. The import cycle this makes is safe because the coordinator is only used inside method bodies, never in an `extends` clause.

## An Operator extends a `*BaseNamed` and reaches its subject through a getter

Whatever an Operator operates on — a sheet, a column — it extends that thing's `*BaseNamed` class and adds methods suited to that data structure. It does **not** extend the concrete class it works through, and it doesn't take one as a constructor argument: the subject is a lazy collaborator getter built from the props already on `this`, named for what it is (`ss`, `sheet`, `column`). `GenericSheetOperator extends SheetBaseNamed<SN>` with `ss`/`sheet`/`schema` getters is the reference shape — `sheet` is the primary (data) sheet, and the metadata view is `sheet.meta`; a column-scoped operator extends `ColumnBaseNamed<SN, CN>` and exposes a `column` getter the same way.

Inheriting the concrete class instead would put its whole surface on the operator, which is the opposite of what the operator is for — it exists to offer a *narrower*, more specific set of methods than the general class does.

## An Operator's props are its identity

What an Operator holds as props is what it *is*; a value that only one run cares about is an argument to the method that needs it. `OccupancyLedgerOperator` is constructed from the spreadsheet alone and its `build(occupancyRowIndex)` takes the occupancy per run, so any caller holding a spreadsheet can build a ledger and two builds in a row are independent.

Holding the row index as an optional field assigned at the start of a build was considered and rejected (#22). It gives the operator two lifetimes with nothing in the type separating them: before a build the field is unset and every step reading it fails, and after one returns the field still names the previous occupancy, so anything reading the operator then gets a confident answer about the wrong tenancy. That is DESIGN.md's "Make disagreement structurally impossible" applied to an operator's own state.

## Push a domain query onto the object that owns it

When a coordinating class composes several calls on a collaborator to answer one domain question, that composition belongs on the collaborator as its own named method — not re-inlined at every call site. `ColumnConfigOperator` used to reach through `sheet.uniformRow("columnId").activeValueArr` and `.hasValue(columnId)` directly; that logic moved onto `SheetMetaNamed` itself as `get activeColumnIds()` and `isActiveColumnId(columnId)`, and `ColumnConfigOperator`'s own private helper now just delegates:

```ts
private _isActiveColumnId(sheetGid: number, columnId: string): boolean {
  return this.ss.raw.sheetMeta(sheetGid).isActiveColumnId(columnId);
}
```

Destructure a collaborator's getter directly when only one property is needed: `const { activeColumnIds } = this.ss.raw.sheetMeta(sheetGid);`.

A container method that takes an index/id as a parameter, but is only ever called by code that already has that exact value as its own instance state, is a sign the query belongs on the instance instead — drop the parameter along with the method. `SheetBaseRaw.columnValidationValues(colIndex: number)` was deleted; its one caller always already had its own `colIndex`, so the query moved to `ColumnMetaRaw` as `get valueValidationStrings()`, reading `this.sheet.activeTable.columnValidationValues.get(this.colIndex)` (`ColumnMetaRaw.ts`). The parameter disappearing is what turns it into a getter (see the getter rule in [naming.md](./naming.md)).

## Extract the shared piece when the second caller is foreseen, not when it arrives

Keeping a helper private until a second call site actually exists is the wrong default here. When the sibling caller is already visible — another sheet of the same shape, another endpoint of the same family — build the shared class now and put it where the framework keeps its operators. The name-to-ID resolver was written as a general operator on its first caller because Add Occ Charge and Add Occ Payment obviously want it (#24). The same judgment governs framework behaviour an endpoint asks for: build the general form rather than the one fitted to the endpoint that asked, which is why per-row reporting serves any endpoint instead of only the batch one that motivated it (#23). This is not licence to build for imagined callers, and DESIGN.md's "Record a deliberate absence as deliberate" still governs a feature nobody has asked for. The test is whether you can name the second caller.

## Model state at the granularity the concept actually has

The principle and its other instances live in DESIGN.md; what follows is where it lands on member placement. A member that **samples the top data row to derive a column-wide fact** belongs on the Meta column — that is membership criterion 2 of the Meta/primary axis (VOCABULARY.md, "Meta / primary"), and `isFormula`/`numberFormatType` are the case that produced it. They match `ColumnSchema.isFormula`, the schema-based trait, and are read off the column's top data-row cell only because that is how the API delivers them; so they live as `activeIsFormula`/`activeNumberFormatType` on `ColumnMetaRaw`, populated once per column by `SheetRaw._integrateSheetData`, not as per-row/per-cell state on `CellRaw`/`RowBaseRaw`.

The criterion bites on the derived fact, not on row or cell addressing: `topCell` and `topRow` stay primary, or a Meta class would end up handing out data rows.

## Class member order

1. `static init()`
2. Plain getters for derived collaborators/state (`ss`, `schema`, `sheetConfigOperator`, ...)
3. Public behavior methods
4. Private helpers, `_`-prefixed — ordered so a helper used by only one caller sits immediately after that caller (detail follows the step that needs it); a helper reused by several later methods comes first, in the order of its first use. (`_initSheetGidsApiAccesses`/`_isSheetGidApiAccesses`, each used by multiple methods, sit first in `ColumnConfigOperator`; `_isActiveColumnId`, called only by `_pruneColumnRows`, sits directly after it.)

## A helper that never reads `this` is a module function

A private helper with zero references to `this` depends on nothing the instance holds, so it leaves the class: an unexported function below the class, with the moved functions ordered by their first use in the class. Every private helper left in the class body then depends on instance state, and a reader can tell the two kinds of helper apart without reading each body. Keeping it unexported means the move doesn't widen the module's interface. `SpreadsheetBaseSchema`'s `makeUniqueIdBase` is an example (#64).

- **A helper whose arguments are one collaborator and that collaborator's state belongs on the collaborator**, not below the class. `SpreadsheetRaw._finalizeFetchedCells(sheet, state)` became `SheetRaw.finalizeFetchedCells()` (#64).
- **A helper that reads `this` only to reach a collaborator stays a method.** Moving it out would mean passing the collaborator in, which is the threading this file warns against.
- **A public method that happens not to read `this` stays put.** It is part of the class's interface, not a helper.
- **A helper that only renames a function already in scope is deleted**, and its callers call that function. `SpreadsheetBaseSchema.ssConfig` wrapped the imported `ssConfigGet` with the same signature.
- **Helpers that share a subject and pass nothing to each other become an object bundle** named for the subject and written with method shorthand, so the names shorten and the group reads as one unit (`googleColor.fromRgb`, `uniformRows.index`).
- **Helpers that keep passing the same value to each other become a helper class** that holds the value, in its own file, so their signatures stop threading it. This is the #22 lesson at a smaller scale. If the class touches tier state, it is a collaborator and follows the coordinator rules above: it extends the tier's Base class and is reached through a lazy getter.

## Delete dead scaffolding you touch — with one exception

Editing a file is the moment to remove, not preserve, a stub nothing calls, a placeholder function (`function triggerAuth(): void { return; }`), or a variable instantiated and discarded (`const columnConfig = ColumnConfigOperator.init();` with no use of `columnConfig`). An empty function body is better than a dead unused variable or an unreferenced helper kept "in case."

**Exception: commented-out code.** Flag it and ask before deleting — don't remove it as part of a cleanup pass. It might be an intentional breadcrumb rather than leftover cruft.

**Zero callers is not proof of dead.** Some members are parked for planned work and carry no marker distinguishing them from cruft — `SheetRaw.clearRowIndexStale` and `SheetRaw.requestSortGSheet` are both intentional. A grep-derived list of uncalled members is a set of candidates, not a verdict: name what you found and ask, rather than deleting on the count. A member whose only caller is a test is a third case again — deleting it deletes coverage.

## One class per file

A file named for a class holds only that class, so the file name tells a reader everything in it. There are no exceptions, custom `Error` subclasses included; `max-classes-per-file` enforces it. A helper type or free function that serves one class lives in that class's file.

Splitting a class family can close an import cycle through an `extends` clause; [schema classes](../architecture/schema-classes.md) covers why that crashes and how `SpreadsheetBaseSchema` breaks it.

## Keep "why" comments across a refactor

A comment explaining a non-obvious invariant (e.g. why two sheets must sync in one flush) carries over verbatim across a restructure — it documents the invariant, not the code shape around it.

