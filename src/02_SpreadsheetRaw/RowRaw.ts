import type { CellValue, CellValueName } from "../00_base/base";
import { RowCommonRaw } from "./ClassBases/RowCommonRaw";
import type { RowRawProps } from "./ClassBases/RowRawBase";

export class RowRaw extends RowCommonRaw {
  constructor(props: RowRawProps) {
    super(props);
    this.validateIsDataRow();
  }
  valueOrEmpty<VN extends CellValueName>(
    colIndex: number,
    valueNameAssert?: VN,
  ): CellValue<VN> {
    return this.cell(colIndex, valueNameAssert).valueOrEmpty();
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
    this.validateSheetKeepsADataRow();
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
  // A new row copies its formulas from the rows already there, so one must survive.
  private validateSheetKeepsADataRow(): void {
    if (!this.sheet.isDownToLastDataRow) return;
    throw new Error(
      `Cannot delete row ${this.rowIndex} of sheetGid ${this.sheetGid}: it is the sheet's last data row, and a sheet may never be left with none. Clear the row instead.`,
    );
  }
}
