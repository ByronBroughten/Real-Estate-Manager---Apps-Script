import type {
  CellValue,
  CellValueName,
  UniformRowName,
  UniformRowValue,
  UniformRowValueName,
} from "../00_base/base";
import { CellRaw } from "./ClassBases/CellRaw";
import { ColumnCommon } from "./ClassBases/ColumnCommon";
import { DataColumnRaw } from "./ClassBases/DataColumnRaw";
import { SpreadsheetRaw } from "./SpreadsheetRaw";

export class ColumnRaw<
  VN extends CellValueName = CellValueName,
  VL extends CellValue<VN> = CellValue<VN>,
> extends ColumnCommon<VN> {
  get ss() {
    return new SpreadsheetRaw(this.spreadsheetRawProps);
  }
  get data(): DataColumnRaw<VN, VL> {
    return new DataColumnRaw<VN, VL>(this.columnRawProps);
  }
  cell(rowIndex: number): CellRaw<VN> {
    return new CellRaw({
      ...this.columnRawProps,
      rowIndex,
    });
  }
  uniformCell<UN extends UniformRowName>(
    rowName: UN,
  ): CellRaw<UniformRowValueName<UN>> {
    const rowIndex = this.schema.uniformRowIndex(rowName);
    const valueName = this.schema.uniformValueName(rowName);
    return new CellRaw({
      ...this.columnRawProps,
      rowIndex,
      valueName,
    });
  }
  insert({ idPrefix, header }: { idPrefix: string; header: string }): this {
    const columnId = this.sheet.makeColumnId(idPrefix);
    this.sheet.colIdRow.updateValue(this.colIndex, columnId);
    this.sheet.headerRow.updateValue(this.colIndex, header);
    return this;
  }
  updateUniformCell<UN extends UniformRowName>(
    rowName: UN,
    newValue: UniformRowValue<UN>,
  ): this {
    this.sheet.uniformRow(rowName).updateValue(this.colIndex, newValue);
    return this;
  }
}
