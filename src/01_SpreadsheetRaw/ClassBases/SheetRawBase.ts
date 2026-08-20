import type { GoogleSheet } from "../../00_base/AppsScriptTypes";
import { SheetSchemaIndexed } from "../../03_SpreadsheetIndexed/SheetSchemaIndexed";
import { Obj } from "../../utils/Obj";
import { valS } from "../../utils/validation";
import type { PreFetchGridRange, RawSheetState } from "../ClassTypes/RawState";
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
        preFetchGridRanges: [],
        indexesOfFullRowsToFetch: new Set(),
        indexesOfColDataToFetch: new Set(),
      });
    }
  }
  protected _initSheetState(sheet: GoogleSheet): void {
    if (sheet?.properties?.title) {
      this.sheetState.title = sheet.properties.title;
    }
    const tables = sheet.tables;
    if (tables && tables.length > 0) {
      const table = valS.assert(tables[0], "table");
      this.sheetState.activeTable = {
        tableId: valS.assert(table.tableId, "tableId"),
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
    return new SheetSchemaIndexed(this.sheetGid);
  }
  protected get sheetState(): RawSheetState {
    return valS.assert(
      this.rawState.sheets.get(this.sheetGid),
      `sheetState for sheetGid ${this.sheetGid}`,
    );
  }
  // It would probably be better if there were a function like, "set sheetState".
  get preFetchGridRanges(): PreFetchGridRange[] {
    return this.sheetState.preFetchGridRanges;
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
