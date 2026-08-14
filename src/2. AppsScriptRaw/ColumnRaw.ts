import type {
  CellValue,
  CellValueName,
  UniformRowName,
  UniformRowValue,
} from "../1.0 Configs/0.0 ConfigPrecursors";
import { ColumnRawBase } from "./ClassBases/ColumnRawBase";
import { SheetRaw } from "./SheetRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

export class ColumnRaw<
  VN extends CellValueName = CellValueName,
  VL extends CellValue<VN> = CellValue<VN>,
> extends ColumnRawBase<VN> {
  get ss() {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get sheet() {
    return new SheetRaw(this.sheetRawProps);
  }
  get dataValueArr(): VL[] {
    return this.sheet.dataRowIndexes.map((rowIdx) => this.dataValue(rowIdx));
  }
  get makeAllDataRange() {
    return {
      sheetId: this.sheetGid,
      startRowIndex: this.sheetSchema.topDataRowIdx,
      endRowIndex: this.sheet.activeTable.endRowIndex,
      startColumnIndex: this.colIndex,
      endColumnIndex: this.colIndex + 1,
    };
  }
  dataValue(rowIdx: number): VL {
    return this.sheet.row(rowIdx).value(this.colIndex, this.valueName) as VL;
  }
  updateDataCell(rowIdx: number, newValue: VL): ColumnRaw<VN, VL> {
    this.sheet.dataRow(rowIdx).updateValue(this.colIndex, newValue);
    return this;
  }
  updateUniformCell<UN extends UniformRowName>(
    rowName: UN,
    newValue: UniformRowValue<UN>,
  ): ColumnRaw<VN, VL> {
    this.sheet.uniformRow(rowName).updateValue(this.colIndex, newValue);
    return this;
  }
  prepFetchAllDataCells() {
    this.ss.gatherFetchRanges(this.makeAllDataRange);
    return this;
  }
  validateIndexNotStale(): void {
    const { lastNotStaleColumnIdx } = this.sheetState;
    if (
      lastNotStaleColumnIdx !== null &&
      this.colIndex > lastNotStaleColumnIdx
    ) {
      throw new Error(
        `Column index ${this.colIndex} is stale. Last not stale column index is ${lastNotStaleColumnIdx}.`,
      );
    }
  }
}
