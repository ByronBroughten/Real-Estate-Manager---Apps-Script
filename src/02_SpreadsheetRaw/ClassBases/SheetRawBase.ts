import type { SheetSnapshot, TableSnapshot } from "../../00_base/RawSource";
import { Obj } from "../../utils/Obj";
import { Val } from "../../utils/Val";
import {
  emptySheetStateRaw,
  type ColumnStateRaw,
  type RowStateRaw,
  type SheetStateRaw,
} from "../ClassTypes/StateRaw";
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
    if (!this.spreadsheetStateRaw.sheets.has(this.sheetGid)) {
      this.spreadsheetStateRaw.sheets.set(this.sheetGid, emptySheetStateRaw());
    }
  }
  protected _initSheetState(sheet: SheetSnapshot): void {
    if (sheet.title) {
      this.sheetState.working.title = sheet.title;
    }
    const tables = sheet.tables;
    if (!tables) {
      return;
    }
    if (tables.length > 1) {
      this.sheetState.working.hasExtraTables = true;
      this.sheetState.working.knownTable = null;
      this._clearColumnPropertyFields();
      return;
    }
    this.sheetState.working.hasExtraTables = false;
    if (tables.length === 0) {
      return;
    }
    const table = Val.assert(tables[0], "table");
    const range = Obj.validatePick(
      table,
      "number",
      "startRowIndex",
      "endRowIndex",
      "startColumnIndex",
      "endColumnIndex",
    );
    const previous = this.sheetState.working.knownTable;
    this.sheetState.working.knownTable = {
      tableId: table.tableId,
      ...range,
      rowIndexesAreStale: previous?.rowIndexesAreStale ?? false,
      firstStaleColIndex: previous?.firstStaleColIndex ?? null,
    };
    this._parseColumnProperties(table, range.startColumnIndex);
  }
  private _clearColumnPropertyFields(): void {
    this.sheetState.working.columnStates.forEach((columnState) => {
      delete columnState.validationValues;
      delete columnState.validationConditionType;
      delete columnState.declaredType;
    });
  }
  private _parseColumnProperties(
    table: TableSnapshot,
    startColumnIndex: number,
  ): void {
    this._clearColumnPropertyFields();
    table.columnProperties.forEach((colProps, offset) => {
      // The API omits columnIndex when it's zero, and states it table-relative.
      const colIndex = colProps.columnIndex ?? startColumnIndex + offset;
      const columnState = this._ensureColumnState(colIndex);
      if (colProps.dataValidationValues.length > 0) {
        columnState.validationValues = colProps.dataValidationValues;
      }
      if (colProps.dataValidationConditionType !== undefined) {
        columnState.validationConditionType =
          colProps.dataValidationConditionType;
      }
      if (colProps.columnType !== undefined) {
        columnState.declaredType = colProps.columnType;
      }
    });
  }
  protected _ensureColumnState(colIndex: number): ColumnStateRaw {
    const existing = this.sheetState.working.columnStates.get(colIndex);
    if (existing !== undefined) return existing;
    const created: ColumnStateRaw = {};
    this.sheetState.working.columnStates.set(colIndex, created);
    return created;
  }
  protected get sheetState(): SheetStateRaw {
    return Val.assert(
      this.spreadsheetStateRaw.sheets.get(this.sheetGid),
      `sheetState for sheetGid ${this.sheetGid}`,
    );
  }
  getRowState(rowIndex: number): RowStateRaw {
    return Val.assert(
      this.sheetState.working.rowStates.get(rowIndex),
      `rowState for row ${rowIndex} on sheetGid ${this.sheetGid}`,
    );
  }
  get columnStates(): SheetStateRaw["working"]["columnStates"] {
    return this.sheetState.working.columnStates;
  }
  get sheetLabel(): string {
    return `"${this.sheetState.working.title ?? "(untitled)"}" (gid ${this.sheetGid})`;
  }
  get rowStates(): SheetStateRaw["working"]["rowStates"] {
    return this.sheetState.working.rowStates;
  }
  get sheetRawProps(): SheetRawProps {
    return {
      sheetGid: this.sheetGid,
      ...this.spreadsheetRawProps,
    };
  }
}
