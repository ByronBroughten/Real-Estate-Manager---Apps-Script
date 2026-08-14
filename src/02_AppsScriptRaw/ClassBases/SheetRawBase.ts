import { SheetSchemaRaw } from "../../01_SpreadsheetSchemaRaw/SheetSchemaRaw";
import { Obj } from "../../utils/Obj";
import { valS } from "../../utils/validation";
import type { GoogleSheet } from "../Types/AppsScriptTypes";
import type { RawSheetState } from "../Types/RawState";
import {
  SpreadsheetRawBase,
  type SpreadsheetRawProps,
} from "./SpreadsheetRawBase";

export interface SheetRawProps extends SpreadsheetRawProps {
  sheetGid: number;
}

export class SheetRawNotFoundError extends Error {
  constructor(sheetGid: number) {
    super(`Sheet with sheetGid "${sheetGid}" not found.`);
  }
}

export class SheetRawBase extends SpreadsheetRawBase {
  readonly sheetGid: number;
  constructor({ sheetGid, ...rest }: SheetRawProps) {
    super(rest);
    this.sheetGid = sheetGid;
    this._ensureSheetState();
  }
  private _ensureSheetState() {
    if (!this.rawState.sheets.has(this.sheetGid)) {
      this.rawState.sheets.set(this.sheetGid, {
        title: null,
        activeTable: null,
        rowIndexesAreValid: true,
        lastNotStaleColumnIdx: null,
        rowStates: new Map(),
      });
    }
  }
  protected _initSheetState(sheet: GoogleSheet): void {
    if (sheet?.properties?.title) {
      this.sheetState.title = sheet.properties.title;
    }
    if (sheet.tables?.length > 0) {
      const table = sheet.tables[0];
      this.sheetState.activeTable = {
        tableId: valS.assertDefined(table.tableId, "tableId"),
        ...Obj.validatePick(
          table.range,
          "number",
          "startRowIndex",
          "endRowIndex",
          "startColumnIndex",
          "endColumnIndex",
        ),
      };
    }
  }
  get sheetSchema() {
    return new SheetSchemaRaw(this.sheetGid);
  }
  protected get sheetState(): RawSheetState {
    return this.rawState.sheets.get(this.sheetGid);
  }
  // It would probably be better if there were a function like, "set sheetState".
  get rowIndexesAreValid(): boolean {
    return this.sheetState.rowIndexesAreValid;
  }
  set rowIndexesAreValid(value: boolean) {
    this.sheetState.rowIndexesAreValid = value;
  }
  get lastNotStaleColumnIdx(): number | null {
    return this.sheetState.lastNotStaleColumnIdx;
  }
  set lastNotStaleColumnIdx(value: number | null) {
    this.sheetState.lastNotStaleColumnIdx = value;
  }
  get title(): string {
    if (this.sheetState.title === null) {
      throw new Error(
        `Sheet title is null for sheetGid ${this.sheetGid}. Ensure that the sheet properties have been fetched.`,
      );
    }
    return this.sheetState.title;
  }
  get activeTable(): RawSheetState["activeTable"] {
    if (this.sheetState.activeTable === null) {
      throw new Error(
        `Active table is null for sheetGid ${this.sheetGid}. Ensure that the sheet properties have been fetched.`,
      );
    }
    return this.sheetState.activeTable;
  }
  get rowStates(): RawSheetState["rowStates"] {
    return this.sheetState.rowStates;
  }
  get activeRowIndexes(): number[] {
    return Array.from(this.sheetState.rowStates.keys());
  }
  get dataRowIndexes(): number[] {
    return this.activeRowIndexes.filter((rowIndex) =>
      this.sheetSchema.isDataRowIndex(rowIndex),
    );
  }
  get rowCount(): number {
    return this.sheetState.rowStates.size;
  }
  get dataRowCount(): number {
    return this.rowCount - this.sheetSchema.topDataRowIdx;
  }
  get sheetRawProps(): SheetRawProps {
    return {
      sheetGid: this.sheetGid,
      ...this.spreadsheetRawProps,
    };
  }
}
