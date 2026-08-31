import type { CellValue, CellValueName } from "../../00_base/base";
import { RowCommonRaw } from "./RowCommonRaw";
import type { RowRawProps } from "./RowRawBase";

export class DataRowRaw extends RowCommonRaw {
  constructor(props: RowRawProps) {
    super(props);
    this.validateIsDataRow();
  }
  value<VN extends CellValueName>(
    colIndex: number,
    valueNameAssert?: VN,
  ): CellValue<VN> {
    return this.cell(colIndex, valueNameAssert).value();
  }
  get activeValueArr(): CellValue[] {
    return [...this.rowState.values()];
  }
  private validateIsDataRow(): void {
    if (!this.isDataRow) {
      throw new Error(
        `Row ${this.rowIndex} is not a data row. Cannot perform this operation.`,
      );
    }
  }
  delete(): void {
    this.remove();
    this.addRowChangeToSave({ action: "delete" });
    // this.activeTable.endRowIndex--;
    // TODO: technically, there should should be activeTable and workingTable; active table gets updated only at the update flush. workingTable gets updated immediately.
  }
  append(): this {
    if (this.rowIsActive()) {
      throw new Error(
        `Cannot append row ${this.rowIndex} because it is already active.`,
      );
    }
    this.sheetState.rowStates.set(this.rowIndex, new Map());
    this.addRowChangeToSave({ action: "append" });
    this.activeTable.endRowIndex++;
    return this;
  }
}
