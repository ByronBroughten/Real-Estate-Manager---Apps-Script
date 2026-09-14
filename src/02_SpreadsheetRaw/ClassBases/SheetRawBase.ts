import type { GoogleSheet } from "../../00_base/AppsScriptTypes";
import { Obj } from "../../utils/Obj";
import { Val } from "../../utils/Val";
import type {
  RawColumnCellFacts,
  RawColumnPropertiesState,
  RawRowState,
  RawSheetState,
} from "../ClassTypes/RawState";
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
        cellStateIsStale: false,
        hasFetchedColumnIds: false,
        isPrunedToSelection: false,
        firstStaleColIndex: null,
        rowStates: new Map(),
        reservedRowIndexes: new Set(),
        columnCellFacts: new Map(),
        rowIndexesToFinalize: new Set(),
        colIndexesToFinalize: new Set(),
        cellsToFinalize: new Map(),
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
      const range = Obj.validatePick(
        table.range,
        "number",
        "startRowIndex",
        "endRowIndex",
        "startColumnIndex",
        "endColumnIndex",
      );
      this.sheetState.activeTable = {
        tableId: Val.assert(table.tableId, "tableId"),
        ...range,
        ...this._parseColumnProperties(
          table.columnProperties,
          range.startColumnIndex,
        ),
      };
    }
  }
  private _parseColumnProperties(
    columnProperties:
      GoogleAppsScript.Sheets.Schema.TableColumnProperties[] | undefined,
    startColumnIndex: number,
  ): RawColumnPropertiesState {
    const state: RawColumnPropertiesState = {
      columnValidationValues: new Map(),
      columnDeclaredTypes: new Map(),
    };
    (columnProperties ?? []).forEach((colProps, offset) => {
      // The API omits columnIndex when it's zero, and states it table-relative.
      const colIndex = colProps.columnIndex ?? startColumnIndex + offset;
      const values = (colProps.dataValidationRule?.condition?.values ?? [])
        .map((conditionValue) => conditionValue.userEnteredValue)
        .filter((value): value is string => value !== undefined);
      if (values.length > 0) {
        state.columnValidationValues.set(colIndex, values);
      }
      if (colProps.columnType !== undefined) {
        state.columnDeclaredTypes.set(colIndex, colProps.columnType);
      }
    });
    return state;
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
      `rowState for row ${rowIndex} on sheetGid ${this.sheetGid}`,
    );
  }
  get columnCellFacts(): RawColumnCellFacts {
    return this.sheetState.columnCellFacts;
  }
  get activeTable(): NonNullable<RawSheetState["activeTable"]> {
    if (!this.sheetState.rowIndexesAreValid) {
      throw new Error(
        `Row indexes are not valid for sheetGid ${this.sheetGid}.`,
      );
    }
    const activeTable = this.sheetState.activeTable;
    if (activeTable === null) {
      throw new Error(
        `Active table is null for sheetGid ${this.sheetGid}. Ensure that the sheet properties have been fetched.`,
      );
    }
    return activeTable;
  }
  get sheetLabel(): string {
    return `"${this.sheetState.title ?? "(untitled)"}" (gid ${this.sheetGid})`;
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
