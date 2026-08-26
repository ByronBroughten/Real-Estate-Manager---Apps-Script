import { SchemaBase } from "../02_SpreadsheetRaw/BaseSchema";
import { SheetNamedBase } from "./ClassBases/SheetNamedBase";
import type { SpreadsheetNamedProps } from "./ClassBases/SpreadsheetNamedBase";
import type { DataSheetNamed } from "./DataSheetNamed";
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
    const col = this.sheetConfigData.columns("sheetGid", "letApiAccess");
    this.sheetConfigData.rowIndexesActive.forEach((rowIndex) => {
      if (col.letApiAccess.value(rowIndex)) {
        this.sheetGidsApiAccesses.add(col.sheetGid.valueNotEmpty(rowIndex));
      }
    });
    return this;
  }
  private isSheetGidApiAccesses(sheetGid: number): boolean {
    return this.sheetGidsApiAccesses.has(sheetGid);
  }
  gatherColumnIdsForSheetGidsApiAccesses() {
    this.sheetGidsApiAccesses.forEach((sheetGid) => {
      const sheet = this.ss.sheetByGid(sheetGid);
      sheet.uniformRow("columnId").raw.gatherFetchFull();
    });
  }
  get ss(): SpreadsheetNamed {
    return new SpreadsheetNamed(this.spreadsheetNamedProps);
  }
  get sheet(): SheetNamed<"columnConfig"> {
    return this.ss.sheet(this.sheetName);
  }
  get sheetData(): DataSheetNamed<"columnConfig"> {
    return this.sheet.data;
  }
  get sheetConfigData(): SheetConfigOperator["sheet"]["data"] {
    return new SheetConfigOperator(this.spreadsheetNamedProps).sheet.data;
  }
  get schema(): SchemaBase {
    return new SchemaBase();
  }
  fetchAndAddMissingColumnIds(): this {
    this.sheetConfigData.prepFetchColumnsFull(
      "sheetGid",
      "letApiAccess", // for initSheetGidsApiAccesses
    );
    this.ss.fetchAllPrepped();
    this.initSheetGidsApiAccesses();
    this.gatherColumnIdsForSheetGidsApiAccesses();
    this.ss.fetchAllPrepped();
    this.addMissingColumnids();
    return this;
  }
  addMissingColumnids() {
    const col = this.sheetConfigData.columns(
      "sheetGid",
      "letApiAccess", // for initSheetGidsApiAccesses
    );
    let idsAdded = 0;
    this.sheetConfigData.rowIndexesActive.forEach((rowIndex) => {
      const sheetGid = col.sheetGid.value(rowIndex);
      if (sheetGid !== "" && !this.isSheetGidApiAccesses(sheetGid)) {
        const sheet = this.ss.sheetByGid(sheetGid);
        idsAdded += sheet.addMissingColumnIds();
      }
    });
    Logger.log(
      `ensureColumnIds: prepared to add ${idsAdded} missing column ID(s)`,
    );
    return this;
  }
  fetchAndUpdateColumnConfig() {
    // for initSheetGidsApiAccesses
    this.sheetConfigData.prepFetchColumnsFull("sheetGid", "letApiAccess");
    this.sheetData.prepFetchColumnsFull("sheetGid", "columnId");
    this.ss.fetchAllPrepped();
    this.initSheetGidsApiAccesses();
    this.gatherColumnIdsForSheetGidsApiAccesses();
    this.ss.fetchAllPrepped();

    this.addMissingColumnids();
    this._pruneColumnRows();
    this._appendColumnRows();
    this._updateProgrammaticValues();
    return this;
  }
  isActiveColumnId(sheetGid: number, columnId: string): boolean {
    const sheet = this.ss.sheetByGid(sheetGid);
    return sheet.uniformRow("columnId").hasValue(columnId);
  }
  _pruneColumnRows(): ColumnConfigOperator {
    const col = this.sheetData.columns("sheetGid", "columnId");
    let staleCount = 0;
    this.sheetData.rowIndexesActive.forEach((rowIndex) => {
      const columnId = col.columnId.valueNotEmpty(rowIndex);
      const sheetGid = col.sheetGid.valueNotEmpty(rowIndex);

      if (
        !this.isSheetGidApiAccesses(sheetGid) ||
        !this.isActiveColumnId(sheetGid, columnId)
      ) {
        this.sheetData.row(rowIndex).delete();
        staleCount++;
      }
    });
    Logger.log(
      `pruneColTraits: queued ${staleCount} stale row(s) for deletion.`,
    );
    return this;
  }
  _appendColumnRows(): this {
    const col = this.sheetData.columns("sheetGid", "columnId");
    const existingColumnIds = col.columnId.valueArr;

    let appendedCount = 0;
    this.sheetGidsApiAccesses.forEach((sheetGid) => {
      const sheet = this.ss.sheetByGid(sheetGid);
      const activeColIds = sheet.uniformRow("columnId").activeValueArr;
      activeColIds.forEach((columnId) => {
        if (!existingColumnIds.includes(columnId)) {
          this.sheetData.appendRowWithVals({
            sheetGid: sheetGid,
            columnId: columnId,
          });
        }
        appendedCount++;
      });
    });
    Logger.log(
      `appendColumnRows: queued ${appendedCount} new row(s) for append.`,
    );
    return this;
  }
  _updateProgrammaticValues() {
    // Loop through the existing rows and update the values. You'll need sheet properties and top data rows.
  }
}
