import type { CellValue } from "../../00_base/base";
import { SchemaBase } from "../../03_SpreadsheetIndexed/SchemaBase";
import { valS } from "../../utils/validation";
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
  get schemaBase() {
    return new SchemaBase();
  }
  ensureStateExists() {
    if (!this.rowIsActive()) {
      this.rowStates.set(this.rowIndex, new Map());
    }
  }
  get isDataRow(): boolean {
    return this.rowIndex >= this.sheetSchema.topDataRowIdx;
  }
  get rowState(): RawRowState {
    return valS.assert(
      this.sheetState.rowStates.get(this.rowIndex),
      `rowState for row ${this.rowIndex}`,
    );
  }
  get activeValueArr(): CellValue[] {
    return [...this.rowState.values()];
  }
  returnMissingValues<V extends CellValue>(...values: V[]): V[] {
    return values.filter((value) => !this.activeValueArr.includes(value));
  }
  rowIsActive(): boolean {
    return this.sheetState.rowStates.has(this.rowIndex);
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
  remove(): void {
    this.rowState.delete(this.rowIndex);
  }
}
