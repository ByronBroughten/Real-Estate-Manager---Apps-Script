import type { ColumnSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/ColumnSchemaRaw";
import { RowRawBase } from "./ClassBases/RowRawBase";
import { SheetRaw } from "./SheetRaw";
import type { GoogleCellValue } from "./Types/AppsScriptTypes";
import type {
  CellValue,
  RowChangeProps,
  RowChangesToSave,
  RowChangeUpdateProps,
} from "./Types/RawState";

export class RowRaw extends RowRawBase {
  get sheet() {
    return new SheetRaw(this.sheetRawProps);
  }
  columnSchema(colIdx): ColumnSchemaRaw {
    return this.sheetSchema.column(colIdx);
  }
  get activeColIdxs(): number[] {
    return Array.from(this.rowState.keys());
  }
  get activeColIdxsNotFormula(): number[] {
    return this.activeColIdxs.filter((colIdx) => {
      const columnSchema = this.columnSchema(colIdx);
      return !columnSchema.isFormula;
    });
  }
  value(colIdx: number): CellValue {
    return this.rowState.get(colIdx);
  }
  ensureStateExists() {
    const rowStates = this.sheetState.rowStates;
    if (!rowStates.has(this.idxBase0)) {
      rowStates.set(this.idxBase0, new Map());
    }
  }
  initState(colIdx: number, cellValue: GoogleCellValue | undefined): void {
    this.ensureStateExists();
    const value = this.extractValue(colIdx, cellValue);
    this.rowState.set(colIdx, value);
  }
  extractValue(colIdx, cellValue: GoogleCellValue | undefined): CellValue {
    const columnSchema = this.columnSchema(colIdx);
    if (this.idxBase0 < this.sheetSchema.topBodyRowIdx) {
      // This handles column ID and header rows.
      return columnSchema.extractCellString(cellValue);
    } else {
      return columnSchema.extractCellValue(cellValue);
    }
  }
  resetToDefault(colIdxes: number[] = this.activeColIdxsNotFormula): RowRaw {
    colIdxes.forEach((colIdx) => {
      const columnSchema = this.columnSchema(colIdx);
      const defaultValue = columnSchema.makeDefaultValue();
      this.setValue(colIdx, defaultValue);
    });
    return this;
  }
  setValue(colIdx: number, value: CellValue): RowRaw {
    const columnSchema = this.columnSchema(colIdx);
    if (columnSchema.isFormula) {
      throw new Error(
        `Cannot set state for column ${columnSchema.columnName} because it is a formula column.`,
      );
    }
    this.rowState.set(colIdx, value);
    this._addChangeToSave({ action: "update", colIdxes: [colIdx] });
    return this;
  }
  delete() {
    this.rowState.delete(this.idxBase0);
    this._addChangeToSave({ action: "delete" });
  }

  get sheetRowId(): string {
    return `${this.sheetGid}${this.sheetSchema.idDelimiter}${this.idxBase0}`;
  }
  get changesToSave(): RowChangesToSave {
    this._ensureChnagesToSaveExists();
    return this.allChangesToSave.get(this.sheetRowId);
  }
  private _ensureChnagesToSaveExists(): void {
    const sheetChangesToSave = this.rawState.changesToSave;
    const sheetRowId = this.sheetRowId;
    if (!sheetChangesToSave.has(sheetRowId)) {
      sheetChangesToSave.set(sheetRowId, {
        append: false,
        delete: null,
        update: new Set(),
      });
    }
  }
  _addChangeToSave(props: RowChangeProps): RowRaw {
    const changes = this.changesToSave;
    if (changes.delete) return;
    const actions = {
      append: (_: RowChangeProps) => (changes.append = true),
      delete: (_: RowChangeProps) => (changes.delete = this.deleteRequest),
      update: (props: RowChangeProps) => {
        for (const colIdx of (props as RowChangeUpdateProps).colIdxes) {
          changes.update.add(colIdx);
        }
      },
    };
    actions[props.action](props);
    return this;
  }
  get appendRequest(): GoogleAppsScript.Sheets.Schema.Request {
    return {
      appendCells: {
        sheetId: this.sheetGid,
        tableId: `${this.sheetState.tableId}`,
        rows: [{}],
        fields: "userEnteredValue",
      },
    };
  }

  updateRequest(colIdx: number): GoogleAppsScript.Sheets.Schema.Request {
    return {
      updateCells: {
        range: {
          sheetId: this.sheetGid,
          startRowIndex: this.idxBase0,
          endRowIndex: this.idxBase0 + 1,
          startColumnIndex: colIdx,
          endColumnIndex: colIdx + 1,
        },
        rows: [{ values: [this._userEnteredValue(colIdx)] }],
        fields: "userEnteredValue",
      },
    };
  }
  private _userEnteredValue(
    colIdx: number,
  ): GoogleAppsScript.Sheets.Schema.CellData {
    return {
      userEnteredValue: this.columnSchema(colIdx).makeUserEnteredValue(
        this.value(colIdx),
      ),
    };
  }
  get deleteRequest(): GoogleAppsScript.Sheets.Schema.Request {
    return {
      deleteDimension: {
        range: {
          sheetId: this.sheetGid,
          dimension: "ROWS",
          startIndex: this.idxBase0,
          endIndex: this.idxBase0 + 1,
        },
      },
    };
  }
}
