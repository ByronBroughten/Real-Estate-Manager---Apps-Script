import type { RawRowState } from "../Types/RawState";
import { SheetRawBase, type SheetRawProps } from "./SheetRawBase";

export interface RowRawProps extends SheetRawProps {
  idxBase0: number;
}

export class RowRawBase extends SheetRawBase {
  readonly idxBase0;
  constructor({ idxBase0, ...rest }: RowRawProps) {
    super(rest);
    this.idxBase0 = idxBase0;
  }
  get rowState(): RawRowState {
    return this.sheetState.rowStates.get(this.idxBase0);
  }
  get rowRawProps(): RowRawProps {
    return {
      ...this.sheetRawProps,
      idxBase0: this.idxBase0,
    };
  }
}
