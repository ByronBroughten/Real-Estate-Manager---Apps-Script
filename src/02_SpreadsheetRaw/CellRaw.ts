import type { GridCellSnapshot } from "../00_base/RawSource";
import type { RgbColor } from "../00_base/RgbColor";
import type { CellValue, CellValueName } from "../00_base/base";
import { CellRawBase } from "./ClassBases/CellRawBase";
import type { RowCommonRaw } from "./ClassBases/RowCommonRaw";
import type { RowCellChange } from "./ClassTypes/RawState";
import { SheetRaw } from "./SheetRaw";

export class CellRaw<
  VN extends CellValueName = CellValueName,
> extends CellRawBase {
  get sheet(): SheetRaw {
    return new SheetRaw(this.sheetRawProps);
  }
  get row(): RowCommonRaw {
    return this.sheet.rowCommon(this.rowIndex);
  }
  get gridRange() {
    return {
      sheetId: this.sheetGid,
      startRowIndex: this.rowIndex,
      endRowIndex: this.rowIndex + 1,
      startColumnIndex: this.colIndex,
      endColumnIndex: this.colIndex + 1,
    };
  }
  gatherFetchRange(): this {
    this.sheet.gatherFetchRange(this.gridRange);
    // Sheets omits a never-written cell; finalize treats that as empty.
    const colIndexes =
      this.sheetState.cellsToFinalize.get(this.rowIndex) ?? new Set();
    colIndexes.add(this.colIndex);
    this.sheetState.cellsToFinalize.set(this.rowIndex, colIndexes);
    return this;
  }
  gatherUpdateRequest(change: RowCellChange): void {
    const { formula, ...cellDataChange } = change;
    assertValueAndFormulaExclusive(cellDataChange.value, formula);
    this.updateRequests.update.push({
      kind: "updateCell",
      sheetId: this.sheetGid,
      rowIndex: this.rowIndex,
      colIndex: this.colIndex,
      ...cellDataChange,
      ...(formula !== undefined ? { formula } : {}),
    });
  }
  setValueState(value: CellValue): void {
    if (!this.row.rowIsActive()) {
      throw new Error(
        `Cannot set value for row ${this.rowIndex} because it is not active.`,
      );
    }
    this.rowState.set(this.colIndex, value);
  }
  get isEmpty(): boolean {
    this.validateIsActive();
    const value = this.rowState.get(this.colIndex);
    return value === "";
  }
  validateIsActive(): void {
    if (this.isActive) return;
    if (this.sheet.cellStateIsStale) {
      throw new Error(
        `Cell values went stale when a findReplace was sent; re-fetch before reading row ${this.rowIndex}, column index ${this.colIndex}.`,
      );
    }
    throw new Error(
      `Row ${this.rowIndex} does not have a value set for column index ${this.colIndex}.`,
    );
  }
  get isActive(): boolean {
    return this.row.rowIsActive() && this.rowState.has(this.colIndex);
  }
  ensureActive() {
    if (!this.isActive) {
      this.setValueState("");
    }
  }
  // An untouched cell holds nothing; Raw reports that rather than judging it.
  valueOrEmpty(): CellValue<VN> | "" {
    this.validateIsActive();
    return this.rowState.get(this.colIndex) as CellValue<VN> | "";
  }
  updateValue(value: CellValue<VN>): this {
    this.sheet.activeTable.assertRowIndexesNotStale();
    this.sheet.activeTable.validateColIndexNotStale(this.colIndex);
    this.row.validateIsWritable();
    // A row that was never fetched has no state to mirror the write into.
    if (this.row.rowIsActive()) {
      this.setValueState(value);
    }
    this.row.addRowChangeToSave({
      action: "update",
      colIndex: this.colIndex,
      value,
    });
    return this;
  }
  // No state mirror: the next read still sees the old effective value.
  updateFormula(formula: string): this {
    this.sheet.activeTable.assertRowIndexesNotStale();
    validateFormulaString(formula);
    this.sheet.activeTable.validateColIndexNotStale(this.colIndex);
    this.row.validateIsWritable();
    this.row.addRowChangeToSave({
      action: "update",
      colIndex: this.colIndex,
      formula,
    });
    return this;
  }
  // No state mirror: the read path never fetches colour, so there's none to mirror.
  updateBackgroundColor(backgroundColor: RgbColor): this {
    this.sheet.activeTable.assertRowIndexesNotStale();
    this.sheet.activeTable.validateColIndexNotStale(this.colIndex);
    this.row.validateIsWritable();
    this.row.addRowChangeToSave({
      action: "update",
      colIndex: this.colIndex,
      backgroundColor,
    });
    return this;
  }
  integrateSnapshot(cell: GridCellSnapshot | undefined): void {
    this.setValueState(cell?.value ?? "");
  }
}

export function validateFormulaString(formula: string): void {
  if (formula.startsWith("=")) return;
  throw new Error(`Formula must start with "=". Got "${formula}".`);
}

export function assertValueAndFormulaExclusive(
  value: unknown,
  formula: string | undefined,
): void {
  if (formula !== undefined && value !== undefined) {
    throw new Error("A queued change cannot hold both a value and a formula.");
  }
}

