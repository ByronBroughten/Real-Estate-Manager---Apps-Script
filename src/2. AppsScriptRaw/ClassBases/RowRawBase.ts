import type { CellValue } from "../../1.0 Configs/0.0 ConfigPrecursors";
import { SchemaBase } from "../../1.1 SpreadsheetSchemaRaw/SchemaBase";
import type { RawRowState } from "../Types/RawState";
import { SheetRawBase, type SheetRawProps } from "./SheetRawBase";

export interface RowRawProps extends SheetRawProps {
  rowIndex: number;
}

export class RowRawBase extends SheetRawBase {
  readonly rowIndex;
  constructor({ rowIndex, ...rest }: RowRawProps) {
    super(rest);
    this.rowIndex = rowIndex;
    if (this.schemaBase.isUniformRowIndex(this.rowIndex)) {
      this.ensureStateExists();
    }
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
    return this.sheetState.rowStates.get(this.rowIndex);
  }
  get activeValueArr(): CellValue[] {
    return [...this.rowState.values()];
  }
  get activeColIdxs(): number[] {
    return Array.from(this.rowState.keys());
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
    this.rowState.entries().forEach(([colIdx, cellValue]) => {
      if (cellValue === value) {
        return colIdx;
      }
    });
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
