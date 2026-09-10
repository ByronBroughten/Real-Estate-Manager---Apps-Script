import { SheetRawBase, type SheetRawProps } from "./SheetRawBase";

export interface ColumnRawProps extends SheetRawProps {
  colIndex: number;
}

export class ColumnRawBase extends SheetRawBase {
  readonly colIndex: number;
  constructor({ colIndex, ...rest }: ColumnRawProps) {
    super(rest);
    this.colIndex = colIndex;
  }
  get columnRawProps(): ColumnRawProps {
    return {
      colIndex: this.colIndex,
      ...this.sheetRawProps,
    };
  }
  validateIndexNotStale(): void {
    const { firstStaleColIndex } = this.sheetState;
    if (firstStaleColIndex !== null && this.colIndex >= firstStaleColIndex) {
      throw new Error(
        `Column index ${this.colIndex} is stale. First stale column index is ${firstStaleColIndex}.`,
      );
    }
  }
}
