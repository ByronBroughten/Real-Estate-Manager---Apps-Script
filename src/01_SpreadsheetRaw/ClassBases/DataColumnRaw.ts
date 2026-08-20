import type { CellValue, CellValueName } from "../../00_base/base";
import { SpreadsheetRaw } from "../SpreadsheetRaw";
import { ColumnCommon } from "./ColumnCommon";

export class DataColumnRaw<
  VN extends CellValueName = CellValueName,
  VL extends CellValue<VN> = CellValue<VN>,
> extends ColumnCommon<VN> {
  get ss(): SpreadsheetRaw {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get dataValueArr(): VL[] {
    return this.sheet.activeDataRowIndexes.map((rowIdx) =>
      this.dataValue(rowIdx),
    );
  }
  dataValue(rowIdx: number): VL {
    return this.sheet.row(rowIdx).value(this.colIndex, this.valueName) as VL;
  }
  updateDataCell(rowIdx: number, newValue: VL): this {
    this.sheet.dataRow(rowIdx).updateValue(this.colIndex, newValue);
    return this;
  }
  prepFetchAllDataCells(): this {
    this.gatherFetchRange({ startRowIndex: this.sheetSchema.topDataRowIdx });
    return this;
  }
  fetchDataCellsUsingHeaders(): this {
    this.prepFetchAllDataCells();
    this.ss.fetchAllPrepped();
    return this;
  }
}
