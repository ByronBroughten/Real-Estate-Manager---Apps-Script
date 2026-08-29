import type { GoogleSheet } from "../../00_base/AppsScriptTypes";
import { Obj } from "../../utils/Obj";
import { Val } from "../../utils/Val";
import type { RawRowState, RawSheetState } from "../ClassTypes/RawState";
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
        firstStaleColIndex: null,
        rowStates: new Map(),
      });
    }
  }
  protected _initSheetState(sheet: GoogleSheet): void {
    if (sheet?.properties?.title) {
      this.sheetState.title = sheet.properties.title;
    }
    const tables = sheet.tables;
    if (tables && tables.length > 0) {
      const table = Val.assert(tables[0], "table");
      this.sheetState.activeTable = {
        tableId: Val.assert(table.tableId, "tableId"),
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
  protected get sheetState(): RawSheetState {
    return Val.assert(
      this.rawState.sheets.get(this.sheetGid),
      `sheetState for sheetGid ${this.sheetGid}`,
    );
  }
  getRowState(rowIndex: number): RawRowState {
    return Val.assert(
      this.sheetState.rowStates.get(rowIndex),
      `rowState for row ${rowIndex}`,
    );
  }
  get activeTable(): NonNullable<RawSheetState["activeTable"]> {
    const activeTable = this.sheetState.activeTable;
    if (activeTable === null) {
      throw new Error(
        `Active table is null for sheetGid ${this.sheetGid}. Ensure that the sheet properties have been fetched.`,
      );
    }
    return activeTable;
  }
  get rowStates(): RawSheetState["rowStates"] {
    return this.sheetState.rowStates;
  }
  get sheetRawProps(): SheetRawProps {
    return {
      sheetGid: this.sheetGid,
      ...this.spreadsheetRawProps,
    };
  }
}
