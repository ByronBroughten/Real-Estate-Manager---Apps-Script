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
  private sheetGidsApiAccesses: Set<number>;
  constructor(props: SpreadsheetNamedProps) {
    super({
      sheetName: "columnConfig",
      ...props,
    });
    this.sheetGidsApiAccesses = new Set();
  }
  static init() {
    return new ColumnConfigOperator(
      ColumnConfigOperator.initSpreadsheetNamedProps(),
    );
  }
  private initSheetGidsApiAccesses(): this {
    const sheetConfigData = this.sheetConfig.sheet.data;
    const col = sheetConfigData.prepFetchColumnsFull(
      "sheetGid",
      "letApiAccess",
    );
    this.ss.fetchAllPrepped();
    sheetConfigData.rowIndexesActive.forEach((rowIndex) => {
      if (col.letApiAccess.value(rowIndex)) {
        this.sheetGidsApiAccesses.add(col.sheetGid.valueNotEmpty(rowIndex));
      }
    });
    return this;
  }
  private isSheetGidApiAccesses(sheetGid: number): boolean {
    return this.sheetGidsApiAccesses.has(sheetGid);
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
    const col = this.sheetConfig.sheet.data.prepFetchColumnsFull(
      "sheetGid",
      "letApiAccess",
      "idPrefix",
    );
    this.ss.fetchAllPrepped();
    this.initSheetGidsApiAccesses();
    this._fetchColumnIdRowsForSheets();

    let idsAdded = 0;
    this.sheetConfig.sheet.data.rowIndexesActive.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.value(rowIndex);
      if (sheetGid !== "" && !this.isSheetGidApiAccesses(sheetGid)) {
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
    this.sheet.rowIndexesActive.forEach((rowIndex) => {
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
}
