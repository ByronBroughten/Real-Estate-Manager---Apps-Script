import { SheetRawBase, type SheetRawProps } from "./SheetRawBase";

export interface RowRawProps extends SheetRawProps {
  idxBase0: number;
}

export class RowRawBase extends SheetRawBase {
  readonly idxBase1;
  constructor({ idxBase0, ...rest }: RowRawProps) {
    super(rest);
    this.idxBase1 = idxBase0;
  }
  get idxBase0() {
    return this.idxBase1 - 1;
  }
  get rowRawProps(): RowRawProps {
    return {
      ...this.sheetRawProps,
      idxBase0: this.idxBase1,
    };
  }
}
