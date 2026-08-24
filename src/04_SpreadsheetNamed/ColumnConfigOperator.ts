import { type CellValue } from "../00_base/base";
import { SchemaBase } from "../02_SpreadsheetRaw/SchemaBase";
import type { SheetRaw } from "../02_SpreadsheetRaw/SheetRaw";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";
import type { SpreadsheetNamedProps } from "./ClassBases/SpreadsheetNamedBase";
import { SheetConfigOperator } from "./SheetConfigOperator";
import type { SheetNamed } from "./SheetNamed";
import { SpreadsheetNamed } from "./SpreadsheetNamed";

// const headerToValueNameAuto = makeStructuredConfig(
//   {} as Record<string, CellValueName>,
//   {
//     "Sheet GID": "number",
//     "Sheet name": "string",
//     "Column ID": "string",
//     "Column name": "string",
//     "Is formula": "boolean",
//     "Value name": "string",
//     "Is api status and run": "boolean",
//   } as const,
// );

export class ColumnConfigOperator extends SheetNamedBase<"columnConfig"> {
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "columnConfig",
      ...props,
    });
  }
  static init() {
    return new ColumnConfigOperator(
      ColumnConfigOperator.initSpreadsheetNamedProps(),
    );
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<"columnConfig"> {
    return this.ss.sheet(this.sheetName);
  }
  get sheetConfig(): SheetConfigOperator {
    return new SheetConfigOperator(this.spreadsheetNamedProps);
  }
  get schema(): SchemaBase {
    return new SchemaBase();
  }
  addMissingColumnIds(): void {
    this.ss.raw.fetchAllSheetProperties();
    const col = this.sheetConfig.sheet.data.prepFetchColumnsFull(
      "sheetGid",
      "letApiAccess",
      "idPrefix",
    );
    this.ss.fetchAllPrepped();

    const includedSheetGids = this._includedSheetGids();
    this._fetchColumnIdRowsForSheets(includedSheetGids);

    let idsAdded = 0;
    this.sheetConfig.sheet.dataRowIndexesActive.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.value(rowIndex);
      if (sheetGid !== "" && !includedSheetGids.has(sheetGid)) {
        const idPrefix = col.idPrefix.value(rowIndex);
        if (idPrefix === "") {
          throw new Error(
            `SheetConfigOperator: Sheet GID ${sheetGid} has "Let api access traits" true but no valid "ID prefix" value.`,
          );
        }
        const sheet = this.ss.indexed.sheet(sheetGid);
        idsAdded += sheet.addMissingColumnIds(idPrefix);
      }
    });
    Logger.log(
      `ensureColumnIds: prepared to add ${idsAdded} missing column ID(s)`,
    );
  }
  pruneColTraits(): ColumnConfigOperator {
    this.sheetConfig.sSheet.gatherFetchPrerequisitesForRawColumns();
    this.sSheet.gatherFetchPrerequisitesForRawColumns();
    this.ss.fetchAllPrepped();

    this.sheetConfig.sSheet.gatherFetchDataColumnsUsingHeaders(
      "Sheet GID",
      "Let api access traits",
    );
    this.sSheet.gatherFetchDataColumnsUsingHeaders("Column ID", "Sheet GID");
    this.ss.fetchAllPrepped();

    const includedSheetGids = this._includedSheetGids();
    this._fetchColumnIdRowsForSheets(includedSheetGids);
    const activeColumnIdToSheet =
      this._existingColumnIdToSheet(includedSheetGids);

    const columnIdCol = this.column("Column ID").data;
    const sheetGidCol = this.column("Sheet GID").data;

    let staleCount = 0;
    this.sheet.dataRowIndexesActive.forEach((rowIndex) => {
      const columnId = columnIdCol.dataValue(rowIndex);
      const sheetGid = sheetGidCol.dataValue(rowIndex);

      const hasInactiveColumnId = !activeColumnIdToSheet.has(columnId);
      const belongsToExcludedSheet = !includedSheetGids.has(sheetGid);

      if (hasInactiveColumnId || belongsToExcludedSheet) {
        this.sheet.dataRow(rowIndex).delete();
        staleCount++;
      }
    });
    Logger.log(
      `pruneColTraits: queued ${staleCount} stale row(s) for deletion.`,
    );
    return this;
  }
  // Queues appending a row for every active column that isn't yet
  // documented in this sheet, into changesToSave without sending a
  // batchUpdate, so it can be chained the same way pruneColTraits is. Only
  // columns from sheets marked "Make schema for API" = true in
  // SheetConfigOperator are considered.
  appendColumnRows(): ColumnConfigOperator {
    this.sheetConfig.sSheet.gatherFetchPrerequisitesForRawColumns();
    this.sSheet.gatherFetchPrerequisitesForRawColumns();
    this.ss.fetchAllPrepped();

    this.sheetConfig.sSheet.gatherFetchDataColumnsUsingHeaders(
      "Sheet GID",
      "Let api access traits",
    );
    this.sSheet.gatherFetchDataColumnsUsingHeaders("Column ID");
    this.ss.fetchAllPrepped();

    const includedSheetGids = this._includedSheetGids();
    this._fetchColumnIdRowsForSheets(includedSheetGids);
    const activeColumnIdToSheet =
      this._existingColumnIdToSheet(includedSheetGids);

    const existingColumnIds = new Set(this.column("Column ID").data.valueArr);

    const columnIdCol = this.column("Column ID");
    const sheetGidCol = this.column("Sheet GID");
    const sheetNameCol = this.column("Sheet name");

    let appendedCount = 0;
    activeColumnIdToSheet.forEach((sheet, columnId) => {
      if (existingColumnIds.has(columnId)) return;
      existingColumnIds.add(columnId); // guard against duplicate IDs across sheets

      this.sheet.appendDataRowValues(
        new Map<number, CellValue>([
          [columnIdCol.colIndex, columnId],
          [sheetGidCol.colIndex, sheet.sheetGid],
          [sheetNameCol.colIndex, this.schema.sheetNameFromTitle(sheet.title)],
        ]),
      );
      appendedCount++;
    });
    Logger.log(
      `appendColumnRows: queued ${appendedCount} new row(s) for append.`,
    );
    return this;
  }
  // Fetches every active column ID belonging to the given sheets, mapped to
  // the sheet it came from. Requires _fetchColumnIdRowsForSheets to have
  // already fetched columnId rows for these same sheetGids.
  private _existingColumnIdToSheet(
    sheetGids: Set<number>,
  ): Map<string, SheetRaw> {
    const columnIdToSheet = new Map<string, SheetRaw>();
    sheetGids.forEach((sheetGid) => {
      const sheet = this.ss.sheet(sheetGid);
      sheet.fullTableColIndexes.forEach((colIndex) => {
        const columnId = sheet.colIdRow.uniformValue(colIndex);
        if (columnId) columnIdToSheet.set(columnId, sheet);
      });
    });
    return columnIdToSheet;
  }
  // Fetches properties + the columnId uniform row for exactly the given
  // sheets, rather than every active sheet in the spreadsheet.
  private _fetchColumnIdRowsForSheets(sheetGids: Set<number>): void {
    sheetGids.forEach((sheetGid) => {
      const sheet = this.ss.sheet(sheetGid);
      sheet.gatherFetchProperties();
      sheet.uniformRow("columnId").gatherFetchFull();
    });
    this.ss.fetchAllPrepped();
  }
  private _includedSheetGids(): Set<number> {
    const sheetGidCol = this.sheetConfig.column("Sheet GID").data;
    const makeSchemaCol = this.sheetConfig.column("Let api access traits").data;

    const includedSheetGids = new Set<number>();
    this.sheetConfig.sheet.dataRowIndexesActive.forEach((rowIndex) => {
      if (makeSchemaCol.dataValue(rowIndex)) {
        includedSheetGids.add(sheetGidCol.dataValue(rowIndex));
      }
    });
    return includedSheetGids;
  }
}
