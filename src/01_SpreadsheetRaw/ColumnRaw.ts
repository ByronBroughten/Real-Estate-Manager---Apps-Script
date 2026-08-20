import type {
  CellValue,
  CellValueName,
  UniformRowName,
  UniformRowValue,
} from "../00_base/base";
import { SchemaBase } from "../03_SpreadsheetIndexed/SchemaBase";
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
  get schema() {
    return new SchemaBase();
  }
  get data(): DataColumnRaw<VN, VL> {
    return new DataColumnRaw<VN, VL>(this.columnRawProps);
  }
  prepFetchUniformCell(rowName: UniformRowName): this {
    const rowIndex = this.schema.uniformRowIndex(rowName);
    this.gatherFetchRange({
      startRowIndex: rowIndex,
      endRowIndex: rowIndex + 1,
    });
    return this;
  }
  cellHasValue(rowIndex: number): boolean {
    return this.sheet.row(rowIndex).hasValue(this.colIndex);
  }
  insert({
    idPrefix,
    header,
  }: {
    idPrefix: string;
    header: string;
  }): this {
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
  validateIndexNotStale(): void {
    const { firstStaleColIndex } = this.sheetState;
    if (firstStaleColIndex !== null && this.colIndex >= firstStaleColIndex) {
      throw new Error(
        `Column index ${this.colIndex} is stale. First stale column index is ${firstStaleColIndex}.`,
      );
    }
  }
}
