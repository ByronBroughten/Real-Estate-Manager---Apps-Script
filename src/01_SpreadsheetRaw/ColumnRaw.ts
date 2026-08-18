import type {
  CellValue,
  CellValueName,
  UniformRowName,
  UniformRowValue,
} from "../00_base/base";
import { SchemaBase } from "../03_SpreadsheetIndexed/SchemaBase";
import { ColumnRawBase } from "./ClassBases/ColumnRawBase";
import type { ColumnGridRangeProps } from "./ClassTypes/AccessorsRaw";
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
  get schema() {
    return new SchemaBase();
  }
  get dataValueArr(): VL[] {
    return this.sheet.activeDataRowIndexes.map((rowIdx) =>
      this.dataValue(rowIdx),
    );
  }
  gatherFetchRange(props: ColumnGridRangeProps): ColumnRaw<VN, VL> {
    this.sheet.gatherFetchRange({
      ...props,
      startColumnIndex: this.colIndex,
      endColumnIndex: this.colIndex + 1,
    });
    return this;
  }
  prepFetchUniformCell(rowName: UniformRowName): ColumnRaw<VN, VL> {
    const rowIndex = this.schema.uniformRowIndex(rowName);
    this.gatherFetchRange({
      startRowIndex: rowIndex,
      endRowIndex: rowIndex + 1,
    });
    return this;
  }
  prepFetchAllDataCells() {
    this.gatherFetchRange({ startRowIndex: this.sheetSchema.topDataRowIdx });
    return this;
  }
  cellHasValue(rowIndex: number): boolean {
    return this.sheet.row(rowIndex).hasValue(this.colIndex);
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
  fetchDataCellsUsingHeaders() {
    this.prepFetchAllDataCells();
    this.ss.fetchAllPrepped();
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
