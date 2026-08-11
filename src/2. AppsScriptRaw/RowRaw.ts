import type { CellValue } from "../1.0 Configs/0.0 ConfigPrecursors";
import type {
  ValueConfigKey,
  ValueConfigValue,
} from "../1.0 Configs/4.0 valueConfig";
import type { ColumnSchemaRaw } from "../1.1 SpreadsheetSchemaRaw/ColumnSchemaRaw";
import type { ValueName } from "../2.0 Schemas/3.2 valueSchemas";
import { valS } from "../utils/validation";
import { RowRawBase } from "./ClassBases/RowRawBase";
import { ColumnRaw } from "./ColumnRaw";
import { SheetRaw } from "./SheetRaw";
import type {
  GoogleCellValue,
  GoogleUpdateRequest,
} from "./Types/AppsScriptTypes";
import type {
  RowChangeProps,
  RowChangesToSave,
  RowChangeUpdateProps,
} from "./Types/RawState";

export class RowRaw extends RowRawBase {
  get sheet() {
    return new SheetRaw(this.sheetRawProps);
  }
  column(colIndex: number): ColumnRaw {
    return new ColumnRaw({
      ...this.sheetRawProps,
      colIndex: colIndex,
    });
  }
  columnSchema(colIdx): ColumnSchemaRaw {
    return this.sheetSchema.column(colIdx);
  }
  get isDataRow(): boolean {
    return this.rowIndex >= this.sheetSchema.topDataRowIdx;
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
  isEmptyCell(colIdx: number): boolean {
    if (!this.cellIsActive(colIdx)) {
      throw new Error(
        `Row ${this.rowIndex} does not have a value set for column index ${colIdx}.`,
      );
    }
    const value = this.rowState.get(colIdx);
    return value === "" || value === null || value === undefined;
  }
  returnMissingValues(...values: CellValue[]): CellValue[] {
    return values.filter((value) => !this.activeValueArr.includes(value));
  }
  rowIsActive(): boolean {
    return this.sheetState.rowStates.has(this.rowIndex);
  }
  cellIsActive(colIdx: number): boolean {
    return this.rowState.has(colIdx);
  }
  colIndexOfValue(value: CellValue): number {
    this.rowState.entries().forEach(([colIdx, cellValue]) => {
      if (cellValue === value) {
        return colIdx;
      }
    });
    throw new Error(
      `Value ${value} not found in row ${this.rowIndex}. Cannot find column index.`,
    );
  }
  colIndexOfValueConfig<
    VK extends ValueConfigKey,
    VL extends ValueConfigValue<VK>,
  >(key: VK, value: VL): number {
    const headerName = this.sheetSchema.valueOfConfig(key, value);
    return this.colIndexOfValue(headerName);
  }
  validateIsActive(): void {
    if (!this.rowIsActive()) {
      throw new Error(
        `Row ${this.rowIndex} is not active. Cannot perform this operation.`,
      );
    }
  }
  validateNotDataRow(): void {
    if (this.isDataRow) {
      throw new Error(
        `Cannot make default value for row index ${this.rowIndex} because it is a data row.`,
      );
    }
  }
  value(colIdx: number, valueName?: ValueName): CellValue {
    if (!this.cellIsActive(colIdx)) {
      throw new Error(
        `Row ${this.rowIndex} does not have a value set for column index ${colIdx}.`,
      );
    }

    const value = this.rowState.get(colIdx);
    // Hmmmmm......
    // I don't trust these column indexes on the raw level.
    // What can I do about that?
    if (valueName) {
      this.sheetSchema;

      const columnSchema = this.columnSchema(colIdx);
      if (columnSchema.valueName !== valueName) {
        throw new Error(
          `Value name ${valueName} does not match column value name ${columnSchema.valueName}`,
        );
      }
    }

    return this.rowState.get(colIdx);
  }
  get activeValueArr(): CellValue[] {
    return [...this.rowState.values()];
  }
  ensureStateExists() {
    if (!this.rowIsActive()) {
      this.sheet.rowStates.set(this.rowIndex, new Map());
    }
  }
  integrateState(colIdx: number, cellValue: GoogleCellValue | undefined): void {
    this.ensureStateExists();
    const value = this.extractValue(colIdx, cellValue);
    this.rowState.set(colIdx, value);
  }
  extractValue(colIdx, cellValue: GoogleCellValue | undefined): CellValue {
    const columnSchema = this.columnSchema(colIdx);
    if (this.rowIndex < this.sheetSchema.topDataRowIdx) {
      // This handles column ID and header rows.
      return columnSchema.extractCellString(cellValue);
    } else {
      return columnSchema.extractCellValue(cellValue);
    }
  }
  _validateIsDataRow(): void {
    if (!this.isDataRow) {
      throw new Error(
        `Row ${this.rowIndex} is not a data row. Cannot perform this operation.`,
      );
    }
  }
  _validateHasActiveNonFormulaColumns() {
    if (this.activeColIdxsNotFormula.length === 0) {
      throw new Error(
        `Row ${this.rowIndex} has no active non-formula columns. Cannot perform this operation.`,
      );
    }
  }
  setDataRowToDefault(...colIdxes: number[]): RowRaw {
    this._validateIsDataRow();
    if (colIdxes.length === 0) {
      this._validateHasActiveNonFormulaColumns();
      colIdxes = this.activeColIdxsNotFormula;
    }
    colIdxes.forEach((colIdx) => {
      this._setDataCellToDefaultValue(colIdx);
    });
    return this;
  }
  setValue(colIdx: number, value: CellValue): RowRaw {
    this._validateNotFormulaColumn(colIdx);
    this._validateColumnIndexNotStale(colIdx);
    this.rowState.set(colIdx, value);
    return this._addChangeToSave({ action: "update", colIdxes: [colIdx] });
  }
  private _validateNotFormulaColumn(colIdx) {
    const columnSchema = this.columnSchema(colIdx);
    if (columnSchema.isFormula) {
      throw new Error(
        `Cannot set state for column ${columnSchema.columnName} because it is a formula column.`,
      );
    }
  }
  private _validateColumnIndexNotStale(colIdx) {
    const { lastNotStaleColumnIdx } = this.sheetState;
    if (lastNotStaleColumnIdx !== null && colIdx > lastNotStaleColumnIdx) {
      throw new Error(
        `Cannot reset to default for column index ${colIdx} because it is greater than the last valid column index ${lastNotStaleColumnIdx}.`,
      );
    }
  }
  private _setDataCellToDefaultValue(colIdx: number): RowRaw {
    const defaultValue = this._makeDefaultValue(colIdx);
    this.setValue(colIdx, defaultValue);
    return this;
  }
  private _makeDefaultValue(colIdx: number): CellValue {
    if (this.isDataRow) {
      return this.columnSchema(colIdx).makeDefaultDataValue();
    } else {
      return this._makeDefaultNotDataValue();
    }
  }
  private _makeDefaultNotDataValue(): CellValue {
    this.validateNotDataRow();
    function error(whatRow) {
      throw new Error(`Cannot make default value for ${whatRow} row.`);
      return "";
    }
    const map: Map<number, () => CellValue> = new Map([
      [this.sheetSchema.colIdRowIdx, () => this.sheetSchema.makeColumnId()],
      [this.sheetSchema.headerRowIdx, () => error("header")],
      [this.sheetSchema.actionRowIdx, (() => false) as () => CellValue],
    ]);
    return valS.assertDefined(map.get(this.rowIndex))();
  }
  remove() {
    this.rowState.delete(this.rowIndex);
  }
  delete() {
    this.remove();
    this._addChangeToSave({ action: "delete" });
  }
  get deleteRequest(): GoogleUpdateRequest {
    return {
      deleteDimension: {
        range: {
          sheetId: this.sheetGid,
          dimension: "ROWS",
          startIndex: this.rowIndex,
          endIndex: this.rowIndex + 1,
        },
      },
    };
  }
  get sheetRowId(): string {
    return this.sheetSchema.makeId(this.sheetGid, this.rowIndex);
  }
  get changesToSave(): RowChangesToSave {
    this._ensureChangesToSaveExists();
    return this.allChangesToSave.get(this.sheetRowId) as RowChangesToSave;
  }
  private _ensureChangesToSaveExists(): void {
    const sheetChangesToSave = this.rawState.changesToSave;
    const sheetRowId = this.sheetRowId;
    if (!sheetChangesToSave.has(sheetRowId)) {
      sheetChangesToSave.set(sheetRowId, {
        level: "row",
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
  gatherAppendRequest(): void {
    this.updateRequests.append.push({
      appendCells: {
        sheetId: this.sheetGid,
        tableId: `${this.activeTable.tableId}`,
        rows: [{}],
        fields: "userEnteredValue",
      },
    });
  }

  gatherUpdateRequest(colIdx: number): void {
    this.updateRequests.update.push({
      updateCells: {
        range: {
          sheetId: this.sheetGid,
          startRowIndex: this.rowIndex,
          endRowIndex: this.rowIndex + 1,
          startColumnIndex: colIdx,
          endColumnIndex: colIdx + 1,
        },
        rows: [{ values: [this._userEnteredValue(colIdx)] }],
        fields: "userEnteredValue",
      },
    });
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
}
