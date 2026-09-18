import { Val } from "../../utils/Val";
import type { ColumnStateRaw } from "../ClassTypes/StateRaw";
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
  get columnState(): ColumnStateRaw {
    return Val.assert(
      this.sheetState.columnStates.get(this.colIndex),
      `columnState for column ${this.colIndex} of sheetGid ${this.sheetGid}`,
    );
  }
  get columnRawProps(): ColumnRawProps {
    return {
      colIndex: this.colIndex,
      ...this.sheetRawProps,
    };
  }
}
