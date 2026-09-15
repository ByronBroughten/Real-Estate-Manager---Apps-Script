import type { CellValue } from "../../00_base/base";
import type { RawRowState } from "../ClassTypes/RawState";
import { SheetRawBase, type SheetRawProps } from "./SheetRawBase";

export interface RowRawProps extends SheetRawProps {
  rowIndex: number;
}

export class RowRawBase extends SheetRawBase {
  readonly rowIndex;
  constructor({ rowIndex, ...rest }: RowRawProps) {
    super(rest);
    this.rowIndex = rowIndex;
  }
  ensureStateExists() {
    if (!this.rowIsActive()) {
      this.rowStates.set(this.rowIndex, new Map());
    }
  }
  get isDataRow(): boolean {
    return this.rowIndex >= this.schema.topDataRowIdx;
  }
  get rowState(): RawRowState {
    return this.getRowState(this.rowIndex);
  }
  rowIsActive(): boolean {
    return this.sheetState.rowStates.has(this.rowIndex);
  }
  get isReserved(): boolean {
    return this.sheetState.reservedRowIndexes.has(this.rowIndex);
  }
  reserve(): void {
    this.sheetState.reservedRowIndexes.add(this.rowIndex);
  }
  release(): void {
    this.sheetState.reservedRowIndexes.delete(this.rowIndex);
  }
  validateIsWritable(): void {
    if (!this.isDataRow || this.rowIsActive()) return;
    if (this.sheetState.knownTable === null) {
      throw new Error(
        `Cannot write to row ${this.rowIndex} of sheetGid ${this.sheetGid} before its sheet properties have been fetched.`,
      );
    }
  }
  validateIsActive(): void {
    if (!this.rowIsActive()) {
      throw new Error(
        `Row ${this.rowIndex} is not active. Cannot perform this operation.`,
      );
    }
  }
  colIndexOfValue(value: CellValue): number {
    for (const [colIndex, cellValue] of this.rowState.entries()) {
      if (cellValue === value) {
        return colIndex;
      }
    }
    throw new Error(
      `Value ${value} not found in row ${this.rowIndex}. Cannot find column index.`,
    );
  }
  get rowRawProps(): RowRawProps {
    return {
      ...this.sheetRawProps,
      rowIndex: this.rowIndex,
    };
  }
}
