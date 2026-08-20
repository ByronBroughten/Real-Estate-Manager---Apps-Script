import { RowCommon } from "./RowCommon";
import type { RowRawProps } from "./RowRawBase";

export class DataRowRaw extends RowCommon {
  constructor(props: RowRawProps) {
    super(props);
    this.validateIsDataRow();
  }
  private validateIsDataRow(): void {
    if (!this.isDataRow) {
      throw new Error(
        `Row ${this.rowIndex} is not a data row. Cannot perform this operation.`,
      );
    }
  }
}
