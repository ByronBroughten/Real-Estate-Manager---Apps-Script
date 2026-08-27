import type { CellValue } from "../../00_base/base";
import { SchemaBase } from "../BaseSchema";
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
    return this.rowIndex >= this.schemaBase.topDataRowIdx;
  }
  get rowState(): RawRowState {
    return this.getRowState(this.rowIndex);
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
    this.rowStates.delete(this.rowIndex);
  }
}
