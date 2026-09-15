import type {
  GoogleCellValue,
  GoogleColor,
  GoogleUpdateRequest,
  UserEnteredValue,
} from "../00_base/AppsScriptTypes";
import type { CellValue, CellValueName } from "../00_base/base";
import { Obj } from "../utils/Obj";
import { Val } from "../utils/Val";
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
    if (formula !== undefined) {
      this.updateRequests.update.push(
        formulaPasteDataRequest({
          sheetId: this.sheetGid,
          rowIndex: this.rowIndex,
          columnIndex: this.colIndex,
          formula,
          rowCount: 1,
        }),
      );
    }
    if (!cellChangeHasCellData(cellDataChange)) return;
    this.updateRequests.update.push({
      updateCells: {
        range: this.gridRange,
        rows: [{ values: [cellChangeToCellData(cellDataChange)] }],
        fields: cellChangeFieldMask(cellDataChange),
      },
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
  updateBackgroundColor(backgroundColor: GoogleColor): this {
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
  integrateGState(cellValue: GoogleCellValue | undefined): void {
    const value = this._extractFromSheetValue(cellValue);
    this.setValueState(value);
  }
  private _extractFromSheetValue(
    cellValue: GoogleCellValue | undefined,
  ): CellValue {
    if (cellValue === undefined) {
      return "";
    }
    const effectiveValue = cellValue.effectiveValue;
    if (effectiveValue === undefined) {
      return "";
    }
    if ("stringValue" in effectiveValue) {
      return Val.assert(effectiveValue.stringValue, "stringValue");
    } else if ("boolValue" in effectiveValue) {
      return Val.assert(effectiveValue.boolValue, "boolValue");
    } else if ("numberValue" in effectiveValue) {
      return Val.assert(effectiveValue.numberValue, "numberValue");
    } else {
      return "";
    }
  }
}

export function validateFormulaString(formula: string): void {
  if (formula.startsWith("=")) return;
  throw new Error(`Formula must start with "=". Got "${formula}".`);
}

export interface FormulaPasteDataProps {
  sheetId: number;
  rowIndex: number;
  columnIndex: number;
  formula: string;
  rowCount: number;
}

export function formulaPasteDataRequest({
  sheetId,
  rowIndex,
  columnIndex,
  formula,
  rowCount,
}: FormulaPasteDataProps): GoogleUpdateRequest {
  const field = `"${formula.replaceAll('"', '""')}"`;
  return {
    pasteData: {
      coordinate: { sheetId, rowIndex, columnIndex },
      data: Array.from({ length: rowCount }, () => field).join("\n"),
      delimiter: "\t",
      type: "PASTE_FORMULA",
    },
  };
}

export function assertValueAndFormulaExclusive(
  value: unknown,
  formula: string | undefined,
): void {
  if (formula !== undefined && value !== undefined) {
    throw new Error("A queued change cannot hold both a value and a formula.");
  }
}

export function cellValueToUserEntered(value: CellValue): UserEnteredValue {
  if (typeof value === "string") {
    return { stringValue: value };
  } else if (typeof value === "number") {
    return { numberValue: value };
  } else if (typeof value === "boolean") {
    return { boolValue: value };
  } else {
    throw new Error(
      `Cannot make user entered value for unsupported type "${typeof value}".`,
    );
  }
}

// Assembled from what was queued, so a colour-only write can't blank the value.
type CellDataChange = Omit<RowCellChange, "formula">;

const cellChangeFields = {
  value: "userEnteredValue",
  backgroundColor: "userEnteredFormat.backgroundColor",
} as const satisfies Record<keyof CellDataChange, string>;

export function cellChangeHasCellData(change: CellDataChange): boolean {
  return change.value !== undefined || change.backgroundColor !== undefined;
}

export function cellChangeFieldMask(change: CellDataChange): string {
  return Obj.keys(cellChangeFields)
    .filter((key) => change[key] !== undefined)
    .map((key) => cellChangeFields[key])
    .join(",");
}

export function cellChangeToCellData(change: CellDataChange): GoogleCellValue {
  const data: GoogleCellValue = {};
  if (change.value !== undefined) {
    data.userEnteredValue = cellValueToUserEntered(change.value);
  }
  if (change.backgroundColor !== undefined) {
    data.userEnteredFormat = { backgroundColor: change.backgroundColor };
  }
  return data;
}
