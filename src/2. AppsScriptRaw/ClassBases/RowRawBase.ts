import { SheetRawBase, type SheetRawProps } from "./SheetRawBase";

export interface RowRawProps extends SheetRawProps {
  idxBase1: number;
}

export class RowRawBase extends SheetRawBase {
  readonly idxBase1;
  constructor({ idxBase1, ...rest }: RowRawProps) {
    super(rest);
    this.idxBase1 = idxBase1;
  }
  get idxBase0() {
    return this.idxBase1 - 1;
  }
  get rowRawProps(): RowRawProps {
    return {
      ...this.sheetRawProps,
      idxBase1: this.idxBase1,
    };
  }
}
